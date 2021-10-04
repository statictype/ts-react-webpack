import { useCallback, useMemo, useRef, useState } from 'react';

import type { OrFalsy, UseFormField } from 'types';

const INITIAL = {
  isError: false,
  isValid: false,
  isWarning: false,
  message: null, 
}

type State<T> = Omit<UseFormField<T>, 'isError' | 'isTouched' | 'onChange'>

export type Validation<T> = { isValid: boolean } & Pick<UseFormField<T>, 'isWarning' | 'message'>;

type ValidateFn<T> = (value: OrFalsy<T>) => Validation<T>;

function defaultValidate<T> (value: OrFalsy<T>): Validation<T> {
  return {
    isValid: !!value,
    message: !value ? 'Value cannot be null' : null
  };
}

export function useFormField<T> (defaultValue: T, validate: ValidateFn<T> = defaultValidate): UseFormField<T> {
  const isTouched = useRef(false);
  const [state, setState] = useState<State<T>>({
    ...INITIAL,
    value: defaultValue,
    ...validate(defaultValue),
  });

  const onChange = useCallback(
    (value: OrFalsy<T>) => {
      setState({
        ...state,
        value,
        ...validate(value)
      });
      isTouched.current = true;
    },
    []
  );

  return useMemo(
    () => ({
      ...state,
      isError: isTouched.current && !state.isValid,
      isTouched: isTouched.current,
      onChange,
    }),
    [state, onChange, isTouched.current]
  );
}
