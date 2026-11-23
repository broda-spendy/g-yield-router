// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SenteCards
/// @notice Funds a shareable G$ gift card. The G$ is locked behind a secret claim code: whoever
/// holds the code claims it once, and the sender can take it back after it expires.
contract SenteCards is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice The GoodDollar token this contract holds and pays out.
    IERC20 public immutable gd;

    /// @notice Longest note accepted, in UTF-8 bytes.
    uint256 public constant NOTE_MAX_BYTES = 240;
    /// @notice Longest life a card may have from the moment it is funded.
    uint64 public constant MAX_LIFETIME = 365 days;
    /// @notice Most ids one `cardsBy` call returns.
    uint256 public constant BY_SENDER_MAX = 50;

    /// @notice One funded card.
    struct Card {
        address sender;
        uint96 amount;
        uint64 expiry;
        bool claimed;
        string note;
        bytes32 codeHash;
    }

    mapping(bytes32 id => Card card) private _cards;
    mapping(address sender => bytes32[] ids) private _bySender;
    bytes32[] private _ids;

    /// @notice Total G$ put into cards, in the token's smallest unit.
    uint256 public totalFunded;
    /// @notice Total G$ paid out to claimers, in the token's smallest unit.
    uint256 public totalClaimed;

    event CardFunded(bytes32 indexed id, address indexed sender, uint256 amount, uint64 expiry, string note);
    event CardClaimed(bytes32 indexed id, address indexed claimer, uint256 amount);
    event CardReclaimed(bytes32 indexed id, address indexed sender, uint256 amount);

    error ZeroAddress();
    error ZeroAmount();
    error CardExists();
    error BadExpiry();
    error BadCode();
    error NoteTooLong();
    error UnknownCard();
    error AlreadyClaimed();
    error CardExpired();
    error NotYetExpired();
    error NotSender();

    /// @param gd_ the GoodDollar token on this network
    constructor(IERC20 gd_) {
        if (address(gd_) == address(0)) revert ZeroAddress();
        gd = gd_;
    }

    /// @notice Lock `amount` G$ behind `codeHash` (keccak256 of the secret the link carries).
    /// @dev The caller approves this contract first, then calls this with the approved allowance.
    function fundCard(bytes32 id, uint256 amount, uint64 expiry, string calldata note, bytes32 codeHash)
        external
        nonReentrant
    {
        if (amount == 0) revert ZeroAmount();
        if (codeHash == bytes32(0)) revert BadCode();
        if (_cards[id].sender != address(0)) revert CardExists();
        if (expiry <= block.timestamp || expiry > block.timestamp + MAX_LIFETIME) revert BadExpiry();
        if (bytes(note).length > NOTE_MAX_BYTES) revert NoteTooLong();

        gd.safeTransferFrom(msg.sender, address(this), amount);

        _cards[id] = Card({
            sender: msg.sender,
            amount: uint96(amount),
            expiry: expiry,
            claimed: false,
            note: note,
            codeHash: codeHash
        });
        _bySender[msg.sender].push(id);
        _ids.push(id);
        totalFunded += amount;

        emit CardFunded(id, msg.sender, amount, expiry, note);
    }

    /// @notice Claim a card with its secret. Pays the caller once.
    function claimCard(bytes32 id, bytes32 code) external nonReentrant {
        Card storage card = _cards[id];
        if (card.sender == address(0)) revert UnknownCard();
        if (card.claimed) revert AlreadyClaimed();
        if (block.timestamp > card.expiry) revert CardExpired();
        if (code == bytes32(0) || code != card.codeHash) revert BadCode();

        card.claimed = true;
        uint256 amount = card.amount;
        totalClaimed += amount;
        gd.safeTransfer(msg.sender, amount);

        emit CardClaimed(id, msg.sender, amount);
    }

    /// @notice After the expiry, the sender gets an unclaimed card back.
    function reclaim(bytes32 id) external nonReentrant {
        Card storage card = _cards[id];
        if (card.sender == address(0)) revert UnknownCard();
        if (card.sender != msg.sender) revert NotSender();
        if (card.claimed) revert AlreadyClaimed();
        if (block.timestamp <= card.expiry) revert NotYetExpired();

        card.claimed = true;
        uint256 amount = card.amount;
        gd.safeTransfer(msg.sender, amount);

        emit CardReclaimed(id, msg.sender, amount);
    }

    /// @notice Everything the app shows for one card.
    function cardInfo(bytes32 id) external view returns (Card memory) {
        return _cards[id];
    }

    /// @notice How many cards have been funded.
    function cardCount() external view returns (uint256) {
        return _ids.length;
    }

    /// @notice A sender's card ids, newest first, at most the 50 most recent.
    function cardsBy(address sender) external view returns (bytes32[] memory out) {
        bytes32[] storage all = _bySender[sender];
        uint256 n = all.length;
        uint256 count = n > BY_SENDER_MAX ? BY_SENDER_MAX : n;
        out = new bytes32[](count);
        for (uint256 i = 0; i < count; i += 1) {
            out[i] = all[n - 1 - i];
        }
    }

    /// @notice Everything still claimable: this contract's own G$ balance.
    function outstanding() external view returns (uint256) {
        return gd.balanceOf(address(this));
    }

    /// @notice The card id at position `index` (0 is the oldest), for simple listing.
    function cardIdAt(uint256 index) external view returns (bytes32) {
        return _ids[index];
    }
}
