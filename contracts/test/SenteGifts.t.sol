// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, Actor} from "@goodbuild/Test.sol";
import {MockGoodDollar} from "@goodbuild/MockGoodDollar.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SenteGifts} from "../SenteGifts.sol";

contract SenteGiftsTest is Test {
    MockGoodDollar gd;
    SenteGifts gifts;
    Actor alice;
    Actor bob;
    Actor carol;

    uint256 constant FUND = 1_000e18;

    function setUp() public {
        gd = new MockGoodDollar();
        gifts = new SenteGifts(gd);
        alice = newActor();
        bob = newActor();
        carol = newActor();
        gd.mint(address(alice), FUND);
        gd.mint(address(bob), FUND);
        gd.mint(address(carol), FUND);
    }

    function _approveAndSend(Actor from, address to, uint256 amount, string memory note) internal {
        from.exec(address(gd), abi.encodeCall(gd.approve, (address(gifts), amount)));
        from.exec(address(gifts), abi.encodeCall(gifts.sendGift, (to, amount, note)));
    }

    function testSendGiftForwardsTokensAndRecords() public {
        address bobAddr = address(bob);
        _approveAndSend(alice, bobAddr, 25e18, "Jollof money");

        assertEq(gd.balanceOf(bobAddr), FUND + 25e18, "recipient got the G$");
        assertEq(gd.balanceOf(address(alice)), FUND - 25e18, "sender paid");
        assertEq(gd.balanceOf(address(gifts)), 0, "contract holds nothing");
        assertEq(gifts.totalGifts(), 1, "one gift recorded");
        assertEq(gifts.totalSent(), 25e18, "totalSent matches");

        SenteGifts.Gift memory g = gifts.giftAt(0);
        assertEq(g.from, address(alice), "from");
        assertEq(g.to, bobAddr, "to");
        assertEq(uint256(g.amount), 25e18, "amount");
        assertTrue(keccak256(bytes(g.note)) == keccak256(bytes("Jollof money")), "note kept");

        uint256[] memory ids = gifts.giftsBy(address(alice));
        assertEq(ids.length, 1, "one id for sender");
        assertEq(ids[0], 0, "id is 0");
    }

    function testRecentAndOrder() public {
        address bobAddr = address(bob);
        assertEq(gifts.recent(5).length, 0, "empty contract returns nothing");
        _approveAndSend(alice, bobAddr, 10e18, "one");
        _approveAndSend(alice, bobAddr, 20e18, "two");
        _approveAndSend(alice, bobAddr, 30e18, "three");

        SenteGifts.Gift[] memory rows = gifts.recent(2);
        assertEq(rows.length, 2, "limit respected");
        assertTrue(keccak256(bytes(rows[0].note)) == keccak256(bytes("three")), "newest first");
        assertTrue(keccak256(bytes(rows[1].note)) == keccak256(bytes("two")), "then older");
        assertEq(gifts.recent(99).length, 3, "never more rows than gifts");
        assertEq(gifts.totalSent(), 60e18, "totalSent sums the gifts");
        assertEq(gd.balanceOf(address(gifts)), 0, "still holds nothing");
    }

    function testOneStepTransferAndCall() public {
        address bobAddr = address(bob);
        bytes memory data = abi.encode(bobAddr, "Happy Sunday");
        alice.exec(address(gd), abi.encodeCall(gd.transferAndCall, (address(gifts), 40e18, data)));

        assertEq(gd.balanceOf(bobAddr), FUND + 40e18, "recipient paid in one step");
        assertEq(gd.balanceOf(address(gifts)), 0, "nothing kept");
        assertEq(gifts.totalGifts(), 1, "recorded");
        assertTrue(keccak256(bytes(gifts.giftAt(0).note)) == keccak256(bytes("Happy Sunday")), "note decoded");
        assertEq(gifts.giftAt(0).from, address(alice), "from is the token sender");
    }

    function testGuardsRevertAndRecordNothing() public {
        address bobAddr = address(bob);
        alice.exec(address(gd), abi.encodeCall(gd.approve, (address(gifts), FUND)));

        expectRevert(alice, address(gifts), abi.encodeCall(gifts.sendGift, (bobAddr, 0, "zero")), "zero amount");
        expectRevert(alice, address(gifts), abi.encodeCall(gifts.sendGift, (address(0), 5e18, "nobody")), "zero recipient");
        expectRevert(alice, address(gifts), abi.encodeCall(gifts.sendGift, (address(alice), 5e18, "me")), "self gift");

        // 300 bytes, safely over the 240-byte limit.
        bytes memory raw = new bytes(300);
        for (uint256 i = 0; i < raw.length; i += 1) {
            raw[i] = "a";
        }
        string memory longNote = string(raw);
        expectRevert(alice, address(gifts), abi.encodeCall(gifts.sendGift, (bobAddr, 5e18, longNote)), "note too long");

        assertEq(gifts.totalGifts(), 0, "nothing recorded");
        assertEq(gifts.totalSent(), 0, "nothing counted");
        assertEq(gd.balanceOf(address(gifts)), 0, "no tokens moved");
    }

    function testOnTokenTransferOnlyFromGoodDollar() public {
        bytes memory data = abi.encode(address(bob), "sneaky");
        expectRevert(
            alice,
            address(gifts),
            abi.encodeCall(gifts.onTokenTransfer, (address(alice), 5e18, data)),
            "not the G$ token"
        );
        assertEq(gifts.totalGifts(), 0, "nothing recorded");
    }
}
