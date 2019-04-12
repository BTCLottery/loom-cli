#! /usr/bin/env node

import program from "commander";
import BN from "bn.js";

import { Address, DPOSUser, CryptoUtils, GatewayVersion } from "loom-js";
import { ICandidate } from "loom-js/dist/contracts/dpos";
const coinMultiplier = new BN(10).pow(new BN(18))
import fs from 'fs'
import { equal } from "assert";

program
    .version('0.1.0')
    .option('-c, --config <path>', 'config file absolute path')
    .parse(process.argv)

const config = require(program.config)

const createUser = async (config: any) : Promise<DPOSUser> => {
    console.log("creating user")
    return DPOSUser.createOfflineUserAsync(
        config.ethEndpoint,
        config.ethPrivateKey,
        config.dappchainEndpoint,
        config.dappchainPrivateKey,
        config.chainId,
        config.loomGatewayEthAddress,
        GatewayVersion.SINGLESIG
    );
}

program
  .command("expected-rewards <path>")
  .description(
    "finds the expected rewards given a json file for a user with their loom address"
  )
  .action(async function(path: string) {
    const user = await createUser(config)
    try {
      let rewards = []
      let lean_rewards = []
      const data = require(path)
        for (const d of data) {
            let owner = d.delegator
            let actual_data = d
            let actual_reward : BN;
            try {
                actual_reward = await user.checkRewardsAsync(owner)
            } catch (e) {
                actual_reward = new BN(0)
            }
            console.log(`${owner} -> ${actual_reward}`)
            // @ts-ignore
            d.actual_reward = actual_reward.toString()
            rewards.push(d)
            if (actual_reward.eq(new BN(0))) {
                owner = Address.fromString(`default:${owner}`)
                const mapping = await user.addressMapper!.getMappingAsync(owner)
                const lean = {'user': mapping.to.local.toString(), 'amount': d.expected_reward}
                console.log(lean)
                lean_rewards.push(lean)
            }
        }
      fs.writeFileSync("actual_rewards", JSON.stringify(rewards))
      fs.writeFileSync("lean_rewards.json", JSON.stringify(lean_rewards))
    } catch (err) {
      console.error(err);
    }
  });

program
  .command("deposit <amount>")
  .description(
    "deposit the specified amount of LOOM tokens into the Transfer Gateway"
  )
  .action(async function(amount: string) {
    const user = await createUser(config)
    try {
      const tx = await user.depositAsync(new BN(amount).mul(coinMultiplier));
      await tx.wait();
      console.log(`${amount} tokens deposited to Ethereum Gateway.`);
      console.log(`Rinkeby tx hash: ${tx.hash}`);
    } catch (err) {
      console.error(err);
    }
  });

program
  .command("withdraw <amount>")
  .description(
    "withdraw the specified amount of LOOM tokens via the Transfer Gateway"
  )
  .option(
    "--timeout <number>",
    "Number of seconds to wait for withdrawal to be processed"
  )
  .action(async function(amount: string, options: any) {
    const user = await createUser(config)
    try {
      const actualAmount = new BN(amount).mul(coinMultiplier);
      const tx = await user.withdrawAsync(actualAmount);
      await tx.wait();
      console.log(`${amount} tokens withdrawn from Ethereum Gateway.`);
      console.log(`Rinkeby tx hash: ${tx.hash}`);
    } catch (err) {
      console.error(err);
    } finally {
      if (user) user.disconnect();
    }
  });

program
  .command("resume-withdrawal")
  .description("Resumes a withdrawal from a pending receipt")
  .action(async function() {
    const user = await createUser(config)
    try {
      const tx = await user.resumeWithdrawalAsync();
      if (tx) {
        await tx.wait();
      }
    } catch (err) {
      console.error(err);
    } finally {
        user.disconnect();
    }
  });

program
  .command("receipt")
  .description("Returns the currently pending receipt")
  .action(async function() {
    const user = await createUser(config)
    try {
      const receipt = await user.getPendingWithdrawalReceiptAsync();
      if (receipt) {
        console.log(`Pending receipt:`);
        console.log("Token owner:", receipt.tokenOwner.toString());
        console.log("Contract:", receipt.tokenContract.toString());
        console.log("Token kind:", receipt.tokenKind);
        console.log("Nonce:", receipt.withdrawalNonce.toString());
        console.log("Amount:", receipt.tokenAmount!.toString());
        console.log(
          "Signature:",
          CryptoUtils.bytesToHexAddr(receipt.oracleSignature)
        );
      } else {
        console.log(`No pending receipt`);
      }
    } catch (err) {
      console.error(err);
    }
  });

// DPOS BINDINGS

program
  .command("map-accounts")
  .description("Connects the user's eth/dappchain addresses")
  .action(async function() {
    const user = await createUser(config)
    try {
        console.log('trying to map acc')
      await user.mapAccountsAsync();
        console.log('mapped acc')
    } catch (err) {
      console.error(err);
    }
  });

program
  .command("map-accounts")
  .description("Connects the user's eth/dappchain addresses")
  .action(async function() {
    const user = await createUser(config)
    try {
        console.log('trying to map acc')
      await user.mapAccountsAsync();
        console.log('mapped acc')
    } catch (err) {
      console.error(err);
    }
  });

program
  .command("validator-addresses")
  .description("Show the current DPoS validators")
  .action(async function() {
    const user = await createUser(config)
    try {
      const validators = await user.listValidatorsAsync();
      console.log(`Current validators:`);
      validators.forEach(v => {
        console.log(v.address.local.toChecksumString());
      });
    } catch (err) {
      console.error(err);
    }
  });


program
  .command("list-validators")
  .description("Show the current DPoS validators")
  .action(async function() {
    const user = await createUser(config)
    try {
      const validators = await user.listValidatorsAsync();
      console.log(`Current validators:`);
      validators.forEach(v => {
        console.log("  Pubkey:", CryptoUtils.Uint8ArrayToB64(v.pubKey));
        console.log("  Address:", v.address.toString());
        console.log(
          `  Upblock / block count : ${v.upblockCount} / ${v.blockCount}`
        );
        console.log("  Slash percentage:", v.slashPct);
        console.log("  Distribution total:", v.distributionTotal);
        console.log("  Delegation total:", v.delegationTotal.toString());
        console.log("  Whitelist Amount:", v.whitelistAmount.toString());
        console.log("  Whitelist LocktimeTier:", v.whitelistLockTime.toString());
        console.log("  Delegation total:", v.delegationTotal.toString());
        console.log("\n");
      });
    } catch (err) {
      console.error(err);
    }
  });

program
  .command("list-candidates")
  .description("Show the current DPoS candidates (along with their metadata)")
  .action(async function() {
    const user = await createUser(config)
    try {
      const candidates = await user.listCandidatesAsync();
      console.log(`Current candidates:`);
      candidates.forEach(c => {
        console.log("  Pubkey:", CryptoUtils.Uint8ArrayToB64(c.pubKey));
        console.log("  Address:", c.address.toString());
        console.log("  Fee:", c.fee);
        console.log("  Description:", c.description);
        console.log("  Name:", c.name);
        console.log("  Website:", c.website);
        console.log("\n");
      });
    } catch (err) {
      console.error(err);
    }
  });

program
  .command("check-delegations")
  .description(
    "Check how much has a delegator bonded to a candidate/valdidator"
  )
  .option("-v, --validator <dappchain b64 address>")
  .option("-d, --delegator <dappchain b64 address>")
  .action(async function(option) {
    const user = await createUser(config)
    try {
      const delegation = await user.checkDelegationsAsync(
        option.validator,
        option.delegator
      );
      if (delegation !== null) {
        console.log(`  Validator: ${delegation.delegator.toString()}`);
        console.log(`  Delegator: ${delegation.validator.toString()}`);
        console.log(`  Amount: ${delegation.amount}`);
        console.log(`  Update Amount: ${delegation.updateAmount}`);
        console.log(`  Height: ${delegation.height}`);
        console.log(`  Locktime: ${delegation.lockTime}`);
        console.log(`  Locktime Tier: ${delegation.lockTimeTier}`);
        console.log(`  State: ${delegation.state}`);
      }
    } catch (err) {
      console.error(err);
    }
  });

program
    .command("check-rewards <address>")
  .description("Get back the user rewards")
  .action(async function(address?: string) {
    const user = await createUser(config)
    try {
      const rewards = await user.checkRewardsAsync(address)
      console.log(`User unclaimed rewards: ${rewards}`);
    } catch (err) {
      console.error(err);
    }
  });

program
  .command("claim-delegations")
  .description("Get back the user rewards")
  .option("-a, --account <account to withdraw the rewards to>")
  .action(async function() {
    const user = await createUser(config)
    try {
      const rewards = await user.claimDelegationsAsync();
      console.log(`User claimed back rewards: ${rewards}`);
    } catch (err) {
      console.error(err);
    }
  });

program
  .command("delegate <amount> <validator> <tier>")
  .description("Delegate `amount` to a candidate / validator")
  .action(async function(amount: string, validator: string, tier: string) {
    const user = await createUser(config)
    try {
      const actualAmount = new BN(amount).mul(coinMultiplier);
      console.log(`Delegating ${actualAmount.toString()} to validator`);
      await user.delegateAsync(validator, actualAmount, parseInt(tier));
      console.log(`Delegated ${actualAmount.toString()} to validator`);
    } catch (err) {
      console.error(err);
    }
  });

program
  .command("undelegate <amount> <validator>")
  .option("-v, --validator <dappchain b64 address>")
  .action(async function(amount: string, validator: string) {
    const user = await createUser(config)
    try {
      await user.undelegateAsync(validator, new BN(amount).mul(coinMultiplier));
      console.log(`Undelegated ${amount} LOOM to ${validator}`);
    } catch (err) {
      console.error(err);
    }
  });

// GENERAL DAPPCHAIN/ETH GETTERS

program
  .command("coin-balance")
  .description(
    "display the current DAppChain ERC20 token balance for an account"
  )
  .option(
    "-a, --account <dappchain b64 address | ethereum hex address> | gateway",
    "Account address"
  )
  .action(async function(options) {
    const user = await createUser(config)
    try {
      const dappchainBalance = await user.getDAppChainBalanceAsync(options.account);
      const mainnetBalance = await user.ethereumLoom.balanceOf(user.ethAddress)
      console.log(`The account's dappchain balance is\nDappchain: ${dappchainBalance}\nMainnet:${mainnetBalance} `);
    } catch (err) {
      console.error(err);
    }
  });

program
  .command("my-delegations")
  .description("display the user's delegations to all candidates")
  .action(async function() {
    const user = await createUser(config)
    try {
      const delegations = await user.listDelegatorDelegations()
      for (const delegation of delegations.delegationsArray) {
        console.log(`  Validator: ${delegation.delegator.toString()}`);
        console.log(`  Delegator: ${delegation.validator.toString()}`);
        console.log(`  Amount: ${delegation.amount}`);
        console.log(`  Update Amount: ${delegation.updateAmount}`);
        console.log(`  Height: ${delegation.height}`);
        console.log(`  Locktime: ${delegation.lockTime}`);
        console.log(`  Locktime Tier: ${delegation.lockTimeTier}`);
        console.log(`  State: ${delegation.state}`);
      } 
    } catch (err) {
      console.error(err);
    }
  });

program.version("0.1.0").parse(process.argv);
