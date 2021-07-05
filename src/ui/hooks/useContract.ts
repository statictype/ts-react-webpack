// Copyright 2021 @paritytech/canvas-ui-v2 authors & contributors

import { useCallback } from 'react';
import { useDatabase } from '../contexts';
import { useQuery } from './useQuery';
import { findContractByAddress  } from 'db/queries';

import type { ContractDocument, UseQuery } from 'types/db';

export function useContract(address: string): UseQuery<ContractDocument> {
  const { db } = useDatabase();

  const query = useCallback((): Promise<ContractDocument | null> => {
    return findContractByAddress(db, address);
  }, [address, db, findContractByAddress]);

  return useQuery(query);
}
