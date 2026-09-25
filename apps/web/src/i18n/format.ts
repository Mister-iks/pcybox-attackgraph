import { createLabFormatter, type LabFormatter } from '@pcybox/attackgraph-i18n';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useApp } from '../store.ts';

/** Turns engine messages (ids and values) into localized sentences for the current lab. */
export function useFormat(): LabFormatter {
  const intl = useIntl();
  const lab = useApp((s) => s.lab);
  return useMemo(
    () => createLabFormatter(lab, intl.locale, (id, values) => intl.formatMessage({ id }, values)),
    [intl, lab],
  );
}

export type Formatter = LabFormatter;
