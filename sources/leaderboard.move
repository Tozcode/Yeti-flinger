/// Yeti Flinger on-chain leaderboard and hat collectibles for the CLAY Hackathon III.
module yeti_flinger::leaderboard;

use std::string::String;
use sui::event;

const MAX_ENTRIES: u64 = 50;

public struct Entry has store, copy, drop {
    player: address,
    name: String,
    score: u64,
}

/// Shared object holding the top scores, highest first, one entry per player.
public struct Board has key {
    id: UID,
    entries: vector<Entry>,
}

/// Collectible hat. Tier matches the hat order in the game (0 = beanie ... 5 = aurora).
public struct Hat has key, store {
    id: UID,
    name: String,
    tier: u8,
}

public struct ScoreSubmitted has copy, drop {
    player: address,
    score: u64,
}

public struct HatMinted has copy, drop {
    player: address,
    tier: u8,
}

fun init(ctx: &mut TxContext) {
    transfer::share_object(Board { id: object::new(ctx), entries: vector[] });
}

/// Add or improve the sender's score. Lower scores than the player's existing one are ignored.
public fun submit(board: &mut Board, name: String, score: u64, ctx: &TxContext) {
    let player = ctx.sender();
    let n = board.entries.length();
    let mut i = 0;
    let mut found = false;
    while (i < n) {
        if (board.entries[i].player == player) {
            found = true;
            break
        };
        i = i + 1;
    };
    if (found) {
        if (board.entries[i].score >= score) return;
        board.entries.remove(i);
    };

    let len = board.entries.length();
    let mut pos = 0;
    while (pos < len && board.entries[pos].score >= score) {
        pos = pos + 1;
    };
    if (pos >= MAX_ENTRIES) return;

    board.entries.insert(Entry { player, name, score }, pos);
    if (board.entries.length() > MAX_ENTRIES) {
        board.entries.pop_back();
    };
    event::emit(ScoreSubmitted { player, score });
}

/// Mint a hat to the sender. The game checks the star requirement off-chain.
public fun mint_hat(name: String, tier: u8, ctx: &mut TxContext) {
    let player = ctx.sender();
    transfer::public_transfer(Hat { id: object::new(ctx), name, tier }, player);
    event::emit(HatMinted { player, tier });
}

public fun top(board: &Board): &vector<Entry> {
    &board.entries
}
