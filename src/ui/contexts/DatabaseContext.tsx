// Copyright 2021 @paritytech/canvas-ui-v2 authors & contributors

import { PrivateKey } from '@textile/crypto';
import { Database as DB } from '@textile/threaddb';
import React, { HTMLAttributes, useContext, useEffect, useMemo, useState } from 'react';

import { useCanvas } from './CanvasContext';
import type { DbProps } from 'types/ui';
import { init } from 'db/util';

export const DbContext: React.Context<DbProps> = React.createContext({} as unknown as DbProps);
export const DbConsumer: React.Consumer<DbProps> = DbContext.Consumer;
export const DbProvider: React.Provider<DbProps> = DbContext.Provider;

export function DatabaseContextProvider({ children }: HTMLAttributes<HTMLDivElement>): JSX.Element | null {
  const { endpoint } = useCanvas();
  const [db, setDb] = useState<DB>(new DB(''));
  const [identity, setIdentity] = useState<PrivateKey | null>(null);
  const [isDbReady, setIsDbReady] = useState(false);

  const isRemote = useMemo(
    (): boolean => false, // !isDevelopment
    []
  );

  // initial initialization
  useEffect((): void => {
    async function createDb() {
      try {
        const [db, identity] = await init(endpoint, isRemote);

        setDb(db);
        setIdentity(identity);
        setIsDbReady(true);
      } catch (e) {
        console.error(e);
        setDb(new DB(''));
      }
    }

    createDb()
      .then()
      .catch(e => console.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const props = useMemo<DbProps>(
    () => ({ db, identity, isDbReady }),
    [db, identity, isDbReady]
  );

  if (!db || !props.isDbReady) {
    return null;
  }

  return <DbContext.Provider value={props}>{children}</DbContext.Provider>;
}

export function useDatabase (): DbProps {
  return useContext(DbContext);
}