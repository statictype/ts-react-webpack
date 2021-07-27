// Copyright 2021 @paritytech/canvas-ui-v2 authors & contributors

import { useCallback } from 'react';
import { useDatabase } from '../contexts';
import { starContract, unstarContract } from 'db/queries';

import type { ContractDocument, UserDocument } from 'types';

export function useToggleContractStar(): (_: string) => Promise<[UserDocument, ContractDocument]> {
  const { db, identity, user } = useDatabase();

  return useCallback(
    async (address: string): Promise<[UserDocument, ContractDocument]> => {
      try {
        if (!user) {
          throw new Error('Invalid user');
        }

        const isStarred = user.contractsStarred.includes(address);

        if (isStarred) {
          return unstarContract(db, identity, address);
        } 
        
        return starContract(db, identity, address);
      } catch (e) {
        console.error(new Error(e));

        throw e;
      }
    },
    [db, identity, user]
  );
}
