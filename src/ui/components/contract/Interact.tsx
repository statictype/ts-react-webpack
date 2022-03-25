// Copyright 2022 @paritytech/contracts-ui authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import React, { useEffect, useState, useRef } from 'react';
import { BN_ZERO } from '@polkadot/util';
import { useTranslation } from 'react-i18next';
import { ResultsOutput } from './ResultsOutput';
import { AccountSelect } from 'ui/components/account';
import { Dropdown, Button, Buttons } from 'ui/components/common';
import {
  ArgumentForm,
  InputGas,
  InputBalance,
  InputStorageDepositLimit,
  Form,
  FormField,
} from 'ui/components/form';
import { dryRun, prepareContractTx, sendContractQuery, transformUserInput } from 'api';
import { getBlockHash } from 'api/util';
import { useApi, useTransactions } from 'ui/contexts';
import { BN, CallResult, ContractPromise, RegistryError, SubmittableResult } from 'types';
import { useWeight, useBalance, useArgValues, useFormField, useAccountId } from 'ui/hooks';
import { useToggle } from 'ui/hooks/useToggle';
import { useStorageDepositLimit } from 'ui/hooks/useStorageDepositLimit';
import { createMessageOptions } from 'ui/util/dropdown';

interface Props {
  contract: ContractPromise;
}

export const InteractTab = ({ contract }: Props) => {
  const { t } = useTranslation();
  const { api, keyring, systemChainType } = useApi();
  const {
    value: message,
    onChange: setMessage,
    ...messageValidation
  } = useFormField(contract.abi.messages[0]);
  const [argValues, setArgValues] = useArgValues(message?.args || []);
  const [callResults, setCallResults] = useState<CallResult[]>([]);
  const { value, onChange: setValue, ...valueValidation } = useBalance(100);
  const { value: accountId, onChange: setAccountId, ...accountIdValidation } = useAccountId();
  const [estimatedWeight, setEstimatedWeight] = useState<BN | null>(null);
  const [txId, setTxId] = useState<number>(0);
  const [nextResultId, setNextResultId] = useState(1);
  const [isUsingStorageDepositLimit, toggleIsUsingStorageDepositLimit] = useToggle();

  useEffect(() => {
    setCallResults([]);
    setNextResultId(1);
    setMessage(contract.abi.messages[0]);
    // clears call results and resets data when navigating to another contract page
    // to do: storage for call results
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.address]);

  useEffect((): void => {
    if (!accountId || !message.args || !argValues) return;

    const sender = keyring?.getPair(accountId);

    if (message.isMutating !== true) {
      setEstimatedWeight(null);

      return;
    }

    sender &&
      message.isMutating &&
      contract.abi.messages[message.index].method === message.method &&
      dryRun({
        contract,
        message,
        argValues,
        payment: value,
        sender,
      })
        .then(({ gasRequired }) => {
          setEstimatedWeight(gasRequired);
        })
        .catch(e => {
          console.error(e);
          setEstimatedWeight(null);
        });
  }, [api, accountId, argValues, keyring, message, value, contract]);

  const weight = useWeight(estimatedWeight);
  const storageDepositLimit = useStorageDepositLimit(accountId);

  const transformed = transformUserInput(contract.registry, message.args, argValues);

  const options = {
    gasLimit: weight.weight.addn(1),
    storageDepositLimit: isUsingStorageDepositLimit ? storageDepositLimit.value : undefined,
    value: message.isPayable ? value || BN_ZERO : undefined,
  };

  const { queue, process, txs } = useTransactions();

  const onCallSuccess = ({ status, dispatchInfo, events }: SubmittableResult) => {
    const log = events.map(({ event }) => {
      return `${event.section}:${event.method}`;
    });

    setCallResults([
      ...callResults,
      {
        id: nextResultId,
        data: null,
        isComplete: true,
        message,
        time: Date.now(),
        log,
        blockHash: getBlockHash(status, systemChainType),
        info: dispatchInfo?.toHuman(),
      },
    ]);

    setNextResultId(nextResultId + 1);
  };
  const onCallError = ({ events, dispatchError, dispatchInfo }: SubmittableResult) => {
    const log = events.map(({ event }) => {
      return `${event.section}:${event.method}`;
    });
    setCallResults([
      ...callResults,
      {
        id: nextResultId,
        message,
        time: Date.now(),
        isComplete: true,
        data: null,
        error: dispatchError ? contract.registry.findMetaError(dispatchError.asModule) : undefined,
        log,
        info: dispatchInfo?.toHuman(),
      },
    ]);

    setNextResultId(nextResultId + 1);
  };
  const read = async () => {
    const { result, output } = await sendContractQuery(
      contract.query[message.method],
      keyring.getPair(accountId),
      options,
      transformed
    );

    let error: RegistryError | undefined;

    if (result.isErr && result.asErr.isModule) {
      error = contract.registry.findMetaError(result.asErr.asModule);
    }

    setCallResults([
      ...callResults,
      {
        id: nextResultId,
        log: [],
        message,
        time: Date.now(),
        isComplete: true,
        data: output,
        error,
      },
    ]);

    setNextResultId(nextResultId + 1);
  };

  const isValid = (result: SubmittableResult) => !result.isError && !result.dispatchError;

  const newId = useRef<number>();

  const call = () => {
    const tx = prepareContractTx(contract.tx[message.method], options, transformed);

    if (tx && accountId) {
      newId.current = queue({
        extrinsic: tx,
        accountId,
        onSuccess: onCallSuccess,
        onError: onCallError,
        isValid,
      });
      setTxId(newId.current);
    }
  };

  useEffect(() => {
    async function processTx() {
      txs[txId]?.status === 'queued' && (await process(txId));
    }
    processTx().catch(e => console.error(e));
  }, [process, txId, txs]);

  if (!contract) return null;

  return (
    <div className="grid grid-cols-12 w-full">
      <div className="col-span-6 lg:col-span-6 2xl:col-span-7 rounded-lg w-full">
        <Form>
          <FormField
            className="mb-8"
            id="accountId"
            label={t('account', 'Account')}
            {...accountIdValidation}
          >
            <AccountSelect
              id="accountId"
              className="mb-2"
              value={accountId}
              onChange={setAccountId}
            />
          </FormField>
          <FormField
            id="message"
            label={t('messageLabel', 'Message to Send')}
            {...messageValidation}
          >
            <Dropdown
              id="message"
              options={createMessageOptions(contract.abi.messages)}
              className="mb-4"
              onChange={setMessage}
              value={message}
            >
              {t('noMessagesFound', 'No messages found')}
            </Dropdown>
            {argValues && (
              <ArgumentForm
                args={message.args || []}
                registry={contract.abi.registry}
                setArgValues={setArgValues}
                argValues={argValues}
              />
            )}
          </FormField>

          {message.isPayable && (
            <FormField id="value" label={t('paymentLabel', 'Payment')} {...valueValidation}>
              <InputBalance value={value} onChange={setValue} />
            </FormField>
          )}
          <FormField
            id="maxGasAllowed"
            label={t('maxGasAllowedLabel', 'Max Gas Allowed (M)')}
            isError={!weight.isValid}
            message={!weight.isValid ? t('maxGasAllowedInvalid', 'maxGasAllowedInvalid') : null}
          >
            <InputGas isCall={message.isMutating} withEstimate {...weight} />
          </FormField>
          <FormField
            id="storageDepositLimit"
            label={t('storageDepositLimitLabel', 'Storage Deposit Limit')}
            isError={!storageDepositLimit.isValid}
            message={
              !storageDepositLimit.isValid
                ? storageDepositLimit.message ||
                  t('storageDepositLimitInvalid', 'Invalid storage deposit limit')
                : null
            }
          >
            <InputStorageDepositLimit
              isActive={isUsingStorageDepositLimit}
              toggleIsActive={toggleIsUsingStorageDepositLimit}
              {...storageDepositLimit}
            />
          </FormField>
        </Form>
        <Buttons>
          {message.isPayable || message.isMutating ? (
            <Button
              isDisabled={
                !(weight.isValid || !weight.isActive || txs[txId]?.status === 'processing')
              }
              isLoading={txs[txId]?.status === 'processing'}
              onClick={call}
              variant="primary"
            >
              {t('call', 'Call')}
            </Button>
          ) : (
            <Button
              isDisabled={!(weight.isValid || !weight.isActive)}
              onClick={read}
              variant="primary"
            >
              {t('read', 'Read')}
            </Button>
          )}
        </Buttons>
      </div>
      <div className="col-span-6 lg:col-span-6 2xl:col-span-5 pl-10 lg:pl-20 w-full">
        <ResultsOutput results={callResults} />
      </div>
    </div>
  );
};
