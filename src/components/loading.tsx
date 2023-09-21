import * as React from 'react';
import { loadingStyle, spinStyle } from './styles';
import { classes } from 'typestyle';

export const Loading: React.FC = () => (
  <span className={classes(loadingStyle, spinStyle)} />
);
