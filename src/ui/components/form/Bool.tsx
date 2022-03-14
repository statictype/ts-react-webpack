import React from 'react';
import { SimpleSpread, ValidFormField } from 'types';
import { Dropdown } from 'ui/components/common/Dropdown';

type Props = SimpleSpread<React.HTMLAttributes<HTMLDivElement>, ValidFormField<boolean>>;

const options = [
  {
    value: false,
    label: 'false',
  },
  {
    value: true,
    label: 'true',
  },
];

export function Bool({ value, onChange, ...props }: Props) {
  return <Dropdown {...props} onChange={onChange} options={options} value={value} />;
}
