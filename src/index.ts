#!/usr/bin/env node

import program from "commander";
import BN from "bn.js";

import { DPOSUser, CryptoUtils } from "loom-js";
import { config } from "./trudy_loomv2b";
import { coinMultiplier } from "./loom_mainnet";
import { userInfo } from "os";
import { ICandidate } from "loom-js/dist/contracts/dpos";

// See https://loomx.io/developers/docs/en/testnet-plasma.html#contract-addresses-transfer-gateway
// for the most up to date address.

program
  .command("deposit <amount>")
  .description(
    "deposit the specified amount of LOOM tokens into the Transfer Gateway"
  )
  .action(async function(amount: string) {
    const user = await DPOSUser.createOfflineUserAsync(
      config.ethEndpoint,
      config.ethPrivateKey,
      config.dappchainEndpoint,
      config.dappchainPrivateKey,
      config.chainId,
      config.loomGatewayEthAddress,
      config.loomTokenEthAddress
    );
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
    let user;
    try {
      user = await DPOSUser.createOfflineUserAsync(
        config.ethEndpoint,
        config.ethPrivateKey,
        config.dappchainEndpoint,
        config.dappchainPrivateKey,
        config.chainId,
        config.loomGatewayEthAddress,
        config.loomTokenEthAddress
      );
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
    let user;
    try {
      user = await DPOSUser.createOfflineUserAsync(
        config.ethEndpoint,
        config.ethPrivateKey,
        config.dappchainEndpoint,
        config.dappchainPrivateKey,
        config.chainId,
        config.loomGatewayEthAddress,
        config.loomTokenEthAddress
      );
      const tx = await user.resumeWithdrawalAsync();
      if (tx) {
        await tx.wait();
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (user) {
        user.disconnect();
      }
    }
  });

program
  .command("receipt")
  .description("Returns the currently pending receipt")
  .action(async function() {
    const user = await DPOSUser.createOfflineUserAsync(
      config.ethEndpoint,
      config.ethPrivateKey,
      config.dappchainEndpoint,
      config.dappchainPrivateKey,
      config.chainId,
      config.loomGatewayEthAddress,
      config.loomTokenEthAddress
    );
    try {
      const receipt = await user.getPendingWithdrawalReceiptAsync();
      if (receipt) {
        console.log(`Pending receipt:`);
        console.log("Token owner:", receipt.tokenOwner.toString());
        console.log("Contract:", receipt.tokenContract.toString());
        console.log("Token kind:", receipt.tokenKind);
        console.log("Nonce:", receipt.withdrawalNonce);
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
    const user = await DPOSUser.createOfflineUserAsync(
      config.ethEndpoint,
      config.ethPrivateKey,
      config.dappchainEndpoint,
      config.dappchainPrivateKey,
      config.chainId,
      config.loomGatewayEthAddress,
      config.loomTokenEthAddress
    );
    try {
      await user.mapAccountsAsync();
    } catch (err) {
      console.error(err);
    }
  });
program
  .command("list-validators")
  .description("Show the current DPoS validators")
  .action(async function() {
    const user = await DPOSUser.createOfflineUserAsync(
      config.ethEndpoint,
      config.ethPrivateKey,
      config.dappchainEndpoint,
      config.dappchainPrivateKey,
      config.chainId,
      config.loomGatewayEthAddress,
      config.loomTokenEthAddress
    );
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
    const user = await DPOSUser.createOfflineUserAsync(
      config.ethEndpoint,
      config.ethPrivateKey,
      config.dappchainEndpoint,
      config.dappchainPrivateKey,
      config.chainId,
      config.loomGatewayEthAddress,
      config.loomTokenEthAddress
    );
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
    const user = await DPOSUser.createOfflineUserAsync(
      config.ethEndpoint,
      config.ethPrivateKey,
      config.dappchainEndpoint,
      config.dappchainPrivateKey,
      config.chainId,
      config.loomGatewayEthAddress,
      config.loomTokenEthAddress
    );
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
  .command("claim-delegations")
  .description("Get back the user rewards")
  .option("-a, --account <account to withdraw the rewards to>")
  .action(async function() {
    const user = await DPOSUser.createOfflineUserAsync(
      config.ethEndpoint,
      config.ethPrivateKey,
      config.dappchainEndpoint,
      config.dappchainPrivateKey,
      config.chainId,
      config.loomGatewayEthAddress,
      config.loomTokenEthAddress
    );
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
    const user = await DPOSUser.createOfflineUserAsync(
      config.ethEndpoint,
      config.ethPrivateKey,
      config.dappchainEndpoint,
      config.dappchainPrivateKey,
      config.chainId,
      config.loomGatewayEthAddress,
      config.loomTokenEthAddress
    );
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
    const user = await DPOSUser.createOfflineUserAsync(
      config.ethEndpoint,
      config.ethPrivateKey,
      config.dappchainEndpoint,
      config.dappchainPrivateKey,
      config.chainId,
      config.loomGatewayEthAddress,
      config.loomTokenEthAddress
    );
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
    try {
      const user = await DPOSUser.createOfflineUserAsync(
        config.ethEndpoint,
        config.ethPrivateKey,
        config.dappchainEndpoint,
        config.dappchainPrivateKey,
        config.chainId,
        config.loomGatewayEthAddress,
        config.loomTokenEthAddress
      );
      const balance = await user.getDAppChainBalanceAsync(options.account);
      console.log(`The account's balance is ${balance}`);
    } catch (err) {
      console.error(err);
    }
  });

program
  .command("my-delegations")
  .description("display the user's delegations to all candidates")
  .action(async function() {
    try {
      const user = await DPOSUser.createOfflineUserAsync(
        config.ethEndpoint,
        config.ethPrivateKey,
        config.dappchainEndpoint,
        config.dappchainPrivateKey,
        config.chainId,
        config.loomGatewayEthAddress,
        config.loomTokenEthAddress
      );

      const candidates = await user.listCandidatesAsync();
      for (let i in candidates) {
        const c = candidates[i];
        const address = c.address;
        console.log(`Validator: ${address}:`);
        try {
          const delegation = await user.checkDelegationsAsync(
            address.toString().split(":")[1]
          );
          if (delegation === null) {
            console.log(` No delegation`);
          } else {
            console.log(`  Validator: ${delegation.delegator.toString()}`);
            console.log(`  Delegator: ${delegation.validator.toString()}`);
            console.log(`  Amount: ${delegation.amount}`);
            console.log(`  Update Amount: ${delegation.updateAmount}`);
            console.log(`  Height: ${delegation.height}`);
            console.log(`  Locktime: ${delegation.lockTime}`);
            console.log(`  Locktime Tier: ${delegation.lockTimeTier}`);
            console.log(`  State: ${delegation.state}`);
          }
        } catch (e) {
          console.log("No delegation");
          console.log(e);
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

program.version("0.1.0").parse(process.argv);
