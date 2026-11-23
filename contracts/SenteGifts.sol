// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SenteGifts
/// @notice Passes G$ (GoodDollar) straight from the sender to any wallet, with a short note,
/// and keeps a public, append-only record of the gifts so the app can list them.
/// @dev The contract never keeps a token: every amount is forwarded inside the same call.
contract SenteGifts is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice The GoodDollar token this contract moves.
    IERC20 public immutable gd;

    /// @notice Longest note accepted, in UTF-8 bytes.
    uint256 public constant NOTE_MAX_BYTES = 240;
    /// @notice Most rows one `recent` call returns.
    uint256 public constant RECENT_MAX = 20;
    /// @notice Most rows one `giftsBy` call returns.
    uint256 public constant BY_SENDER_MAX = 50;

    /// @notice One recorded gift.
    struct Gift {
        address from;
        address to;
        uint96 amount;
        uint64 at;
        string note;
    }

    Gift[] private _gifts;
    mapping(address sender => uint256[] ids) private _bySender;

    /// @notice How many gifts have been recorded.
    uint256 public totalGifts;
    /// @notice Total G$ passed through, in the token's smallest unit.
    uint256 public totalSent;

    event GiftSent(uint256 indexed id, address indexed from, address indexed to, uint256 amount, string note, uint256 at);

    error NotGoodDollar();
    error ZeroAddress();
    error ZeroRecipient();
    error SelfGift();
    error ZeroAmount();
    error NoteTooLong();
    error BadData();
    error AmountTooLarge();

    /// @param gd_ the GoodDollar token on this network
    constructor(IERC20 gd_) {
        if (address(gd_) == address(0)) revert ZeroAddress();
        gd = gd_;
    }

    /// @notice Send `amount` G$ to `to` with a note, in one transaction.
    /// @dev The caller approves this contract first, then calls this with the approved allowance.
    function sendGift(address to, uint256 amount, string calldata note) external nonReentrant returns (uint256 id) {
        _check(to, amount, note);
        gd.safeTransferFrom(msg.sender, to, amount);
        id = _record(msg.sender, to, amount, note);
    }

    /// @notice One-step path: the sender calls `gd.transferAndCall(this, amount, data)`.
    /// @param from the wallet the token left
    /// @param amount the amount already transferred to this contract
    /// @param data abi.encode(address to, string note)
    function onTokenTransfer(address from, uint256 amount, bytes calldata data) external nonReentrant returns (bool) {
        if (msg.sender != address(gd)) revert NotGoodDollar();
        if (data.length < 64) revert BadData();
        (address to, string memory note) = abi.decode(data, (address, string));
        _check(to, amount, note);
        gd.safeTransfer(to, amount);
        _record(from, to, amount, note);
        return true;
    }

    /// @notice The newest gifts, newest first. `limit` is capped at 20.
    function recent(uint256 limit) external view returns (Gift[] memory out) {
        uint256 n = _gifts.length;
        if (limit > RECENT_MAX) limit = RECENT_MAX;
        if (limit > n) limit = n;
        out = new Gift[](limit);
        for (uint256 i = 0; i < limit; i += 1) {
            out[i] = _gifts[n - 1 - i];
        }
    }

    /// @notice Gift ids sent by `who`, newest first, at most the 50 most recent.
    function giftsBy(address who) external view returns (uint256[] memory out) {
        uint256[] storage all = _bySender[who];
        uint256 n = all.length;
        uint256 count = n > BY_SENDER_MAX ? BY_SENDER_MAX : n;
        out = new uint256[](count);
        for (uint256 i = 0; i < count; i += 1) {
            out[i] = all[n - 1 - i];
        }
    }

    /// @notice The full gift recorded at position `index` (0 is the oldest).
    function giftAt(uint256 index) external view returns (Gift memory) {
        return _gifts[index];
    }

    function _check(address to, uint256 amount, string memory note) private view {
        if (to == address(0)) revert ZeroRecipient();
        if (to == msg.sender) revert SelfGift();
        if (amount == 0) revert ZeroAmount();
        if (amount > type(uint96).max) revert AmountTooLarge();
        if (bytes(note).length > NOTE_MAX_BYTES) revert NoteTooLong();
    }

    function _record(address from, address to, uint256 amount, string memory note) private returns (uint256 id) {
        id = _gifts.length;
        _gifts.push(Gift({from: from, to: to, amount: uint96(amount), at: uint64(block.timestamp), note: note}));
        _bySender[from].push(id);
        totalGifts = id + 1;
        totalSent += amount;
        emit GiftSent(id, from, to, amount, note, block.timestamp);
    }
}
