// Copyright 2021 @paritytech/substrate-contracts-explorer authors & contributors
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import {
  Homepage,
  Contract,
  Instantiate as InstantiatePage,
  AddContract,
  SelectCodeHash,
} from '../pages';
import { InstantiateContextProvider } from 'ui/contexts';

function Instantiate() {
  return (
    <InstantiateContextProvider>
      <InstantiatePage />
    </InstantiateContextProvider>
  );
}

export const routes = [
  {
    path: `/contract/:address/:activeTab?`,
    component: Contract,
    exact: true,
    fallback: <div> Loading... </div>,
  },
  {
    path: '/instantiate',
    component: AddContract,
    exact: true,
    fallback: <div> Loading... </div>,
  },
  {
    path: '/instantiate/new',
    component: Instantiate,
    exact: true,
    fallback: <div> Loading... </div>,
  },
  {
    path: '/instantiate/hash',
    component: SelectCodeHash,
    exact: true,
    fallback: <div> Loading... </div>,
  },
  {
    path: '/instantiate/hash/:codeHash',
    component: Instantiate,
    exact: false,
    fallback: <div> Loading... </div>,
  },
  {
    path: `/`,
    component: Homepage,
    exact: true,
    fallback: <div> Loading... </div>,
  },
];
