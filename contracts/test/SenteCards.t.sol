// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, Actor} from "@goodbuild/Test.sol";
import {MockGoodDollar} from "@goodbuild/MockGoodDollar.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SenteCards} from "../SenteCards.sol";

contract SenteCardsTest is Test {
    MockGoodDollar gd;
    SenteCards cards;
    Actor alice;
    Actor bob;
    Actor carol;

    uint256 constant FUND = 1_000e18;
    bytes32 constant ID = keccak256("card-one");
    bytes32 constant CODE = keccak256("the-secret");

    function setUp() public {
        gd = new MockGoodDollar();
        cards = new SenteCards(gd);
        alice = newActor();
        bob = newActor();
        carol = newActor();
        gd.mint(address(alice), FUND);
        gd.mint(address(bob), FUND);
    }

    function _fund(Actor from, uint256 amount, bytes32 code, uint64 expiry) internal {
        from.exec(address(gd), abi.encodeCall(gd.approve, (address(cards), amount)));
        from.exec(address(cards), abi.encodeCall(cards.fundCard, (ID, amount, expiry, "Jollof money", code)));
    }

    function testFundThenClaimPaysOnce() public {
        _fund(alice, 50e18, CODE, uint64(block.timestamp + 600));

        assertEq(cards.cardCount(), 1, "one card");
        assertEq(cards.outstanding(), 50e18, "contract holds the card");
        assertEq(cards.totalFunded(), 50e18, "funded total");
        SenteCards.Card memory info = cards.cardInfo(ID);
        assertEq(info.sender, address(alice), "sender");
        assertEq(uint256(info.amount), 50e18, "amount");
        assertTrue(keccak256(bytes(info.note)) == keccak256(bytes("Jollof money")), "note");
        assertTrue(!info.claimed, "not claimed yet");

        bob.exec(address(cards), abi.encodeCall(cards.claimCard, (ID, CODE)));
        assertEq(gd.balanceOf(address(bob)), FUND + 50e18, "claimer paid");
        assertEq(cards.outstanding(), 0, "nothing left");
        assertEq(cards.totalClaimed(), 50e18, "claimed total");

        expectRevert(bob, address(cards), abi.encodeCall(cards.claimCard, (ID, CODE)), "already claimed");
        expectRevert(alice, address(cards), abi.encodeCall(cards.reclaim, (ID)), "cannot reclaim a claimed card");
        assertEq(gd.balanceOf(address(cards)), 0, "holds nothing");
    }

    function testWrongCodeMovesNothing() public {
        _fund(alice, 50e18, CODE, uint64(block.timestamp + 600));
        expectRevert(bob, address(cards), abi.encodeCall(cards.claimCard, (ID, keccak256("guess"))), "wrong code");
        assertEq(gd.balanceOf(address(bob)), FUND, "nothing moved");
        assertEq(cards.outstanding(), 50e18, "still funded");
    }

    function testLiveCardIsClaimableButNotReclaimable() public {
        uint64 expiry = uint64(block.timestamp + 60);
        _fund(alice, 50e18, CODE, expiry);

        // Before its expiry a card belongs to whoever holds the code, never back to the sender.
        expectRevert(alice, address(cards), abi.encodeCall(cards.reclaim, (ID)), "not yet expired");
        expectRevert(bob, address(cards), abi.encodeCall(cards.reclaim, (ID)), "only the sender");
        assertEq(cards.outstanding(), 50e18, "still claimable");

        // A card funded already expired is refused outright.
        expectRevert(
            alice,
            address(cards),
            abi.encodeCall(cards.fundCard, (keccak256("past"), 10e18, uint64(block.timestamp - 1), "late", CODE)),
            "expiry in the past"
        );
        // Too far out.
        expectRevert(
            alice,
            address(cards),
            abi.encodeCall(cards.fundCard, (keccak256("far"), 10e18, uint64(block.timestamp + 400 days), "far", CODE)),
            "expiry too far"
        );
        assertEq(cards.outstanding(), 50e18, "only the live card is funded");
    }

    function testReclaimBeforeExpiryReverts() public {
        _fund(alice, 50e18, CODE, uint64(block.timestamp + 48 hours));
        expectRevert(alice, address(cards), abi.encodeCall(cards.reclaim, (ID)), "not yet expired");
        assertEq(gd.balanceOf(address(alice)), FUND - 50e18, "sender paid in");
        assertEq(cards.outstanding(), 50e18, "card still funded");
    }

    function testFundGuardsAndReusedId() public {
        _fund(alice, 50e18, CODE, uint64(block.timestamp + 600));
        alice.exec(address(gd), abi.encodeCall(gd.approve, (address(cards), 100e18)));

        expectRevert(
            alice,
            address(cards),
            abi.encodeCall(cards.fundCard, (ID, 10e18, uint64(block.timestamp + 600), "again", CODE)),
            "reused id"
        );
        expectRevert(
            alice,
            address(cards),
            abi.encodeCall(cards.fundCard, (keccak256("zero"), 0, uint64(block.timestamp + 600), "free", CODE)),
            "zero amount"
        );
        expectRevert(
            alice,
            address(cards),
            abi.encodeCall(cards.fundCard, (keccak256("nocode"), 10e18, uint64(block.timestamp + 600), "no code", bytes32(0))),
            "zero code hash"
        );

        assertEq(cards.cardCount(), 1, "still one card");
        assertEq(cards.outstanding(), 50e18, "balance matches the one card");
        bytes32[] memory mine = cards.cardsBy(address(alice));
        assertEq(mine.length, 1, "one card for alice");
    }

    // ----------------------------------------------------------------
    // Exploit tests: this contract holds other people's G$.
    // ----------------------------------------------------------------

    /// @notice A stranger tries every call that could move the card's money, and each one fails.
    /// @dev SenteCards has no owner, no pause, no fee and no sweep: the only two ways money leaves
    /// are claimCard (needs the secret) and reclaim (needs to be the sender, after expiry).
    function testExploitUnauthorizedCall() public {
        _fund(alice, 50e18, CODE, uint64(block.timestamp + 600));

        // A stranger cannot send someone else's card back to anyone, themselves included.
        expectRevert(bob, address(cards), abi.encodeCall(cards.reclaim, (ID)), "reclaim is sender-only");
        // Even the sender cannot pull a live card back early.
        expectRevert(alice, address(cards), abi.encodeCall(cards.reclaim, (ID)), "not expired yet");
        // A stranger cannot claim without the secret.
        expectRevert(bob, address(cards), abi.encodeCall(cards.claimCard, (ID, keccak256("guess"))), "claim needs the code");
        // A stranger cannot spend another wallet's G$ by funding a card in their own name.
        expectRevert(
            carol,
            address(cards),
            abi.encodeCall(cards.fundCard, (keccak256("spend-someone-else"), 10e18, uint64(block.timestamp + 600), "steal", CODE)),
            "no allowance from another wallet"
        );

        // Nothing moved and the card still belongs to its sender.
        assertEq(gd.balanceOf(address(cards)), 50e18, "no payout happened");
        assertEq(cards.totalClaimed(), 0, "nothing claimed");
        assertEq(cards.outstanding(), 50e18, "card still funded");
        assertEq(cards.cardInfo(ID).sender, address(alice), "sender unchanged");
        assertEq(cards.cardCount(), 1, "the stranger added no card");
    }

    /// @notice A hostile G$ token calls back into claimCard while the claim is being paid.
    /// @dev The callback must fail and the claimer must be paid exactly once.
    function testExploitReentrancy() public {
        ReenteringGdToken token = new ReenteringGdToken();
        SenteCards hostileCards = new SenteCards(IERC20(address(token)));

        token.mint(address(alice), FUND);
        alice.exec(address(token), abi.encodeCall(token.approve, (address(hostileCards), 50e18)));
        alice.exec(
            address(hostileCards),
            abi.encodeCall(hostileCards.fundCard, (ID, 50e18, uint64(block.timestamp + 600), "trap", CODE))
        );

        // Every transfer from now on tries to claim the same card again from inside the payout.
        token.arm(address(hostileCards), abi.encodeCall(SenteCards.claimCard, (ID, CODE)));
        bob.exec(address(hostileCards), abi.encodeCall(hostileCards.claimCard, (ID, CODE)));

        assertTrue(token.attempted(), "the hostile callback ran while paying");
        assertTrue(token.blocked(), "the reentrant claim was refused");
        assertEq(token.calls(), 1, "exactly one callback");
        assertEq(token.balanceOf(address(bob)), 50e18, "claimer paid exactly once");
        assertEq(hostileCards.totalClaimed(), 50e18, "accounting counted one claim");
        assertEq(token.balanceOf(address(hostileCards)), 0, "the contract keeps nothing");
    }

    /// @notice A large donation straight into the contract must not let anyone take more than their
    /// own card, and must not leave a later card holder with nothing.
    function testExploitDonationInflation() public {
        // First card in is tiny: one smallest unit.
        _fund(alice, 1, CODE, uint64(block.timestamp + 600));

        gd.mint(address(carol), 500_000e18);

        // Someone dumps a large amount straight into the contract, outside the card accounting.
        carol.exec(address(gd), abi.encodeCall(gd.transfer, (address(cards), 500_000e18)));
        assertEq(cards.outstanding(), 500_000e18 + 1, "the donation sits in the contract");

        // The second card funded after the donation still pays exactly what was funded.
        bytes32 secondId = keccak256("card-two");
        bytes32 secondCode = keccak256("second-secret");
        alice.exec(address(gd), abi.encodeCall(gd.approve, (address(cards), 5e18)));
        alice.exec(
            address(cards),
            abi.encodeCall(cards.fundCard, (secondId, 5e18, uint64(block.timestamp + 600), "second", secondCode))
        );

        uint256 bobStart = gd.balanceOf(address(bob));
        bob.exec(address(cards), abi.encodeCall(cards.claimCard, (secondId, secondCode)));
        assertEq(gd.balanceOf(address(bob)), bobStart + 5e18, "second claimer gets their full card, not zero and not the donation");

        // The one-unit card pays one unit: no share of the inflated balance.
        uint256 bobMid = gd.balanceOf(address(bob));
        bob.exec(address(cards), abi.encodeCall(cards.claimCard, (ID, CODE)));
        assertEq(gd.balanceOf(address(bob)), bobMid + 1, "the tiny card pays exactly one unit");

        // The donation cannot be claimed twice, and no claimer can sweep it.
        expectRevert(bob, address(cards), abi.encodeCall(cards.claimCard, (secondId, secondCode)), "no second payout");
        assertEq(cards.outstanding(), 500_000e18, "only the donation is left");
        assertEq(cards.totalClaimed(), 5e18 + 1, "accounting counts the two real claims only");
    }
}

/// @dev A hostile G$ stand-in: it calls back into the target on every transfer it makes.
contract ReenteringGdToken {
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public target;
    bytes private _payload;
    bool public attempted;
    bool public blocked;
    uint256 public calls;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _move(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "allowance");
        allowance[from][msg.sender] = allowed - amount;
        _move(from, to, amount);
        return true;
    }

    /// @notice Arms the next transfer with a call back into `target_`.
    function arm(address target_, bytes calldata payload_) external {
        target = target_;
        _payload = payload_;
        attempted = false;
        blocked = false;
    }

    function _move(address from, address to, uint256 amount) private {
        require(balanceOf[from] >= amount, "balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        if (target != address(0) && !attempted) {
            attempted = true;
            calls += 1;
            (bool ok, ) = target.call(_payload);
            blocked = !ok;
        }
    }
}
