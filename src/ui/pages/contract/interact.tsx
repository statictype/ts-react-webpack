// Copyright 2022 @paritytech/contracts-ui authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { useEffect, useState, useRef, useMemo } from 'react';
import { ResultsOutput } from './results-output';
import {
  AbiMessage,
  ContractExecResult,
  ContractSubmittableResult,
  CallResult,
  SubmittableResult,
  ContractOptions,
  Balance,
  UIContract,
} from 'types';
import { AccountSelect } from 'ui/shared/account';
import { Button, Buttons } from 'ui/shared/buttons';
import { ArgumentForm, Form, FormField, OptionsForm } from 'ui/shared/form';
import { BN_ZERO } from 'lib/bn';
import { useApi, useTransactions } from 'ui/contexts';
import { useWeight, useBalance, useArgValues } from 'ui/hooks';
import { useStorageDepositLimit } from 'ui/hooks/use-storage-deposit-limit';
import { createMessageOptions, Dropdown } from 'ui/shared/dropdown';
import {
  decodeStorageDeposit,
  getGasLimit,
  getStorageDepositLimit,
  transformUserInput,
} from 'lib/call-options';
import { getDecodedOutput } from 'lib/output';

interface Props {
  contract: UIContract;
}

export const InteractTab = ({
  contract: {
    abi,
    abi: { registry },
    tx,
    address,
  },
}: Props) => {
  const { accounts, api } = useApi();
  const { queue, process, txs } = useTransactions();
  const [message, setMessage] = useState<AbiMessage>();
  const [argValues, setArgValues, inputData] = useArgValues(message, registry);
  const [callResults, setCallResults] = useState<CallResult[]>([]);
  const valueState = useBalance(BN_ZERO);
  const { value } = valueState;
  const [accountId, setAccountId] = useState('');
  const [txId, setTxId] = useState<number>(0);
  const [nextResultId, setNextResultId] = useState(1);
  const [outcome, setOutcome] = useState<ContractExecResult>();
  const storageDepositLimit = useStorageDepositLimit(accountId);
  const refTime = useWeight(outcome?.gasRequired.refTime.toBn());
  const proofSize = useWeight(outcome?.gasRequired.proofSize.toBn());
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const isCustom = refTime.mode === 'custom' || proofSize.mode === 'custom';

  useEffect((): void => {
    if (!accounts || accounts.length === 0) return;
    setAccountId(accounts[0].address);
  }, [accounts]);

  useEffect(() => {
    setMessage(abi.messages[0]);
    setOutcome(undefined);
    // todo: call results storage
    setCallResults([]);
  }, [abi.messages, setArgValues, address]);

  const params: Parameters<typeof api.call.contractsApi.call> = useMemo(() => {
    return [
      accountId,
      address,
      message?.isPayable
        ? api.registry.createType('Balance', value)
        : api.registry.createType('Balance', BN_ZERO),
      getGasLimit(isCustom, refTime.limit, proofSize.limit, api.registry),
      getStorageDepositLimit(storageDepositLimit.isActive, storageDepositLimit.value, api.registry),
      inputData ?? '',
    ];
  }, [
    accountId,
    address,
    api.registry,
    inputData,
    isCustom,
    message?.isPayable,
    proofSize.limit,
    refTime.limit,
    storageDepositLimit.isActive,
    storageDepositLimit.value,
    value,
  ]);

  useEffect((): void => {
    async function dryRun() {
      if (!message) return;
      const o = await api.call.contractsApi.call(...params);
      setOutcome(o);
    }

    function debouncedDryRun() {
      if (timeoutId.current) clearTimeout(timeoutId.current);
      timeoutId.current = setTimeout(() => {
        dryRun().catch(err => console.error(err));
        timeoutId.current = null;
      }, 300);
    }

    debouncedDryRun();
  }, [api.call.contractsApi, message, params, nextResultId]);

  useEffect(() => {
    async function processTx() {
      txs[txId]?.status === 'queued' && (await process(txId));
    }
    processTx().catch(e => console.error(e));
  }, [process, txId, txs]);

  const onSuccess = ({ events, contractEvents, dispatchError }: ContractSubmittableResult) => {
    message &&
      setCallResults([
        ...callResults,
        {
          id: nextResultId,
          message,
          time: Date.now(),
          contractEvents,
          events,
          error: dispatchError?.isModule
            ? api.registry.findMetaError(dispatchError.asModule)
            : undefined,
        },
      ]);

    setNextResultId(nextResultId + 1);
  };

  const newId = useRef<number>();

  const call = () => {
    if (!outcome || !message || !accountId) throw new Error('Unable to call contract.');

    const { storageDeposit, gasRequired } = outcome;
    const { isActive, value: userInput } = storageDepositLimit;
    const predictedStorageDeposit = decodeStorageDeposit(storageDeposit);
    const options: ContractOptions = {
      gasLimit: getGasLimit(isCustom, refTime.limit, proofSize.limit, api.registry) ?? gasRequired,
      storageDepositLimit: getStorageDepositLimit(
        isActive,
        userInput,
        api.registry,
        predictedStorageDeposit,
      ),
      value: message.isPayable ? (params[2] as Balance) : undefined,
    };

    const isValid = (result: SubmittableResult) => !result.isError && !result.dispatchError;

    const extrinsic = tx[message.method](
      options,
      ...transformUserInput(registry, message.args, argValues),
    );

    newId.current = queue({
      extrinsic,
      accountId,
      onSuccess,
      isValid,
    });
    setTxId(newId.current);
  };

  const decodedOutput = outcome && message && getDecodedOutput(outcome, message, registry);

  const callDisabled =
    !refTime.isValid ||
    !proofSize.isValid ||
    txs[txId]?.status === 'processing' ||
    !!outcome?.result.isErr ||
    !!decodedOutput?.isError;

  const isDispatchable = message?.isMutating || message?.isPayable;

  return (
    <div className="grid w-full grid-cols-12">
      <div className="w-full col-span-6 rounded-lg lg:col-span-6 2xl:col-span-7">
        <Form key={`${address}`}>
          <FormField
            className="mb-8 caller"
            help="The sending account for this interaction. Any transaction fees will be deducted from this account."
            id="accountId"
            label="Caller"
          >
            <AccountSelect
              className="mb-2"
              id="accountId"
              onChange={setAccountId}
              value={accountId}
            />
          </FormField>
          <FormField
            help="The message to send to this contract. Parameters are adjusted based on the stored contract metadata."
            id="message"
            label="Message to Send"
          >
            <Dropdown
              className="mb-4 constructorDropdown"
              id="message"
              onChange={(m?: AbiMessage) => {
                m?.identifier !== message?.identifier && setOutcome(undefined);
                setMessage(m);
              }}
              options={createMessageOptions(registry, abi.messages)}
              value={message}
            >
              No messages found
            </Dropdown>
            {argValues && (
              <ArgumentForm
                argValues={argValues}
                args={message?.args ?? []}
                registry={registry}
                setArgValues={setArgValues}
              />
            )}
          </FormField>

          {isDispatchable && (
            <OptionsForm
              isPayable={!!message.isPayable}
              proofSize={proofSize}
              refTime={refTime}
              storageDepositLimit={storageDepositLimit}
              value={valueState}
            />
          )}
        </Form>
        <Buttons>
          {isDispatchable && (
            <Button
              isDisabled={callDisabled}
              isLoading={txs[txId]?.status === 'processing'}
              onClick={call}
              variant="primary"
            >
              Call contract
            </Button>
          )}
        </Buttons>
      </div>
      <div className="w-full col-span-6 pl-10 lg:col-span-6 lg:pl-20 2xl:col-span-5">
        {message && (
          <ResultsOutput
            message={message}
            outcome={outcome}
            registry={registry}
            results={callResults}
          />
        )}
      </div>
    </div>
  );
};
