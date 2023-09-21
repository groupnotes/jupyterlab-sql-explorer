import * as React from 'react';
import { showDialog, ReactWidget } from '@jupyterlab/apputils';
import { TranslationBundle } from '@jupyterlab/translation';
import { IPass } from '../interfaces';
import { SqlModel } from '../model';
import { dlgStyle300 } from './styles';

export async function askPasswd(
  pass_info: IPass,
  model: SqlModel,
  trans: TranslationBundle
): Promise<void> {
  /*const buttons = [
    Dialog.cancelButton(),
    Dialog.okButton({ label: trans.__('Submit') })
  ];*/

  const result = await showDialog<IPass>({
    title: trans.__('Please input password'),
    body: new AskPassDialog(pass_info, trans),
    hasClose: false,
    focusNodeSelector: 'input.bp3-input'
  });

  // if (result.button.label === trans.__('OK')) {
  //   const pi = result.value as IPass
  //   model.set_pass(pi)
  // }
  if (result.value) {
    model.set_pass(result.value);
  }
}

class AskPassDialog extends ReactWidget {
  constructor(pass_info: IPass, trans: TranslationBundle) {
    super();
    this._pass_info = pass_info;
    this._trans = trans;
  }

  getValue(): IPass {
    return this.form.getValue();
  }

  render(): JSX.Element {
    const { db_id, db_user, db_pass } = this._pass_info;
    return (
      <PassForm
        dialog={this}
        db_id={db_id}
        db_user={db_user}
        db_pass={db_pass}
        trans={this._trans}
      />
    );
  }

  public form!: PassForm;
  private _pass_info: IPass;
  private _trans: TranslationBundle;
}

interface IPassFormProps extends Partial<IPass> {
  dialog: AskPassDialog;
  trans: TranslationBundle;
}

class PassForm extends React.Component<IPassFormProps, Partial<IPass>> {
  constructor(props: IPassFormProps) {
    super(props);
    this.state = {
      db_id: this.props.db_id,
      db_user: this.props.db_user,
      db_pass: this.props.db_pass
    };
  }

  getValue(): IPass {
    return this.state as IPass;
  }

  render() {
    this.props.dialog.form = this;
    const { db_user, db_pass } = this.state;
    const { trans } = this.props;
    return (
      <div className={dlgStyle300}>
        <div className="jp-InputGroup">
          <div>{trans.__('user')}</div>
          <input
            className="bp3-input"
            value={db_user}
            placeholder={trans.__('user connect to database')}
            onChange={this._onChange('db_user')}
          />
          <div>{trans.__('password')}</div>
          <input
            type="password"
            className="bp3-input"
            value={db_pass}
            placeholder={trans.__('passwor')}
            onChange={this._onChange('db_pass')}
          />
        </div>
      </div>
    );
  }

  private _onChange =
    (key: keyof IPass) => (event: React.ChangeEvent<HTMLInputElement>) => {
      this.setState({ [key]: event.target.value });
    };
}
