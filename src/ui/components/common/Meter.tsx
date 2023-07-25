// Copyright 2022 @paritytech/contracts-ui authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

interface MeterProps {
  label?: React.ReactNode;
  accessory?: React.ReactNode;
  withAccessory?: boolean;
}

export function Meter({ accessory, label, withAccessory }: MeterProps) {
  return (
    <div className="relative pt-2">
      <div className="pb-2 text-xs text-gray-500">
        {label}
        {withAccessory && <div className="float-right">{accessory}</div>}
      </div>
    </div>
  );
}
