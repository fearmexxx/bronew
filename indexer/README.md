# Brother ID Indexer

This directory contains the configuration for indexing Brother ID events using [Apibara](https://www.apibara.com/).

## Configuration

The `apibara.config.json` file is configured to index events from the Brother Naming Service contract on Starknet Sepolia.

### Tracked Events

- `DomainRegistered` (Selector: `0x02ac2972ebc7a424742a0346bf272764a77a87c67776264627473772277d7376`)
- `Transfer` (Selector: `0x0099cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9`)

## Usage

1.  Install the Apibara CLI.
2.  Set the `MONGO_CONNECTION_STRING` environment variable.
3.  Run the indexer:
    ```bash
    apibara run apibara.config.json
    ```

## Sink

The indexer sinks data to a MongoDB database named `brother_id` in the `events` collection. This data can be queried by the frontend to provide fast search and profile pages without hitting the Starknet RPC directly.
