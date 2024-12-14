# Anky

Anky is a decentralized journaling and self-reflection platform that helps you connect with your inner self through timed 8-minute writing sessions, guided by an 8-second countdown timer that ends your session as soon as it ends.

## Core Features

- **Timed Writing Sessions**: Engage in focused 8-minute writing sessions with an 8-second countdown timer
- **Blockchain Integration**: Each writing session is stored on IPFS, following our [session data storage formatting](https://gist.githubusercontent.com/jpfraneto/a41d29ce4049d1eb435e95326e045544/raw/c75654a8e9cdc76efc26b1c40d4aa960f8d9d403/writing_session.txt). The IPFS hash is stored on degen chain, associated with this contract: [0xbc25ea092e9bed151fd1947ee1cf957cfdd580ef](https://explorer.degen.tips/address/0xbc25ea092e9bed151fd1947ee1cf957cfdd580ef)
- **Farcaster Integration**: Share your insights with the community: anky is a farcaster client.
- **Private & Secure**: We need to figure out how to make this happen.

## Technical Stack

- Backend: Go
- Smart Contracts: Solidity (Deployed on Degen Chain)
- Authentication: Privy
- Social Integration: Farcaster
- AI: Custom Fine Tuned Models

## Getting Started

1. Visit warpcast (or any farcaster client) and write a cast tagging @anky. wait for it to reply with the frame where you can write.
2. Write your 8-minute writing session.
3. Your anky will be deployed on degenchain and on base as a CLANKER erc20 token.

## For Developers

Contribute. Help. Reach out.

@jpfraneto.eth on warpcast
