import * as React from 'react';
import { showDialog, Dialog } from '@jupyterlab/apputils';
import { TranslationBundle } from '@jupyterlab/translation';
import { ReactWidget } from '@jupyterlab/apputils';
import { dlgStyle300, errStyle } from './styles';
import { IDBConn } from '../interfaces';
import { SqlModel } from '../model';

type TChgFun = (event: React.ChangeEvent<any>) => void;

type InputProps = {
  name: string;
  value?: string;
  placeholder?:string;
  onChange: TChgFun;
};

const Inp: React.FC<InputProps> = ({
  name,
  value,
  placeholder,
  onChange
}): React.ReactElement => (
  <div className="jp-sql-exp-input">
    <span>{name}</span>
    <input className="bp3-input" placeholder={placeholder} value={value || ''} onChange={onChange} />
  </div>
);

export class ConnDialog extends ReactWidget {
  constructor(conn: IDBConn, trans: TranslationBundle) {
    super();
    this._conn = conn as IDBConn;
    this._trans = trans;
  }

  getValue(): IDBConn {
    return this.form.getValue();
  }

  render(): JSX.Element {
    return <ConnForm dialog={this} conn={this._conn} trans={this._trans} />;
  }

  public form!: ConnForm;
  private _conn: IDBConn;
  private _trans: TranslationBundle;
}

interface IConnFormProps {
  dialog: ConnDialog;
  trans: TranslationBundle;
  conn?: IDBConn;
}

class ConnForm extends React.Component<IConnFormProps, Partial<IDBConn>> {
  constructor(props: IConnFormProps) {
    super(props);
    this.state = { ...this.props.conn, db_type: '2' };
    //if (!('db_type' in this.state) || this.state.db_type=='' ) this.state.db_type='2'
  }

  getValue(): IDBConn {
    return this.state as IDBConn;
  }

  render() {
    this.props.dialog.form = this;
    const {
      db_id,
      db_type,
      db_name,
      db_host,
      db_port,
      db_user,
      db_pass,
      name,
      errmsg
    } = this.state;
    const { trans } = this.props;
    return (
      <div className={dlgStyle300}>
        {errmsg && <div className={errStyle}>{errmsg}</div>}
        <div className="jp-InputGroup">
          <Inp
            name={trans.__('Name')}
            placeholder={trans.__('Human-readable name')}
            value={name}
            onChange={this._onChange('name')}
          />
          <Inp name="ID" value={db_id} placeholder={trans.__('Unique ID')} onChange={this._onChange('db_id')} />
          <div className="jp-sql-exp-input">
            <span>{trans.__('Type')}</span>
            <select
              className="bp3-input"
              value={db_type}
              onChange={this._onChange('db_type')}
            >
              <option value="1">mysql</option>
              <option value="2">pgsql</option>
              <option value="3">oracle</option>
              <option value="4">hive</option>
              <option value="5">hive-kerbert</option>
              <option value="6">sqlite</option>
            </select>
          </div>
          {db_type !== '6' && (
            <>
              <Inp
                name={trans.__('IP')}
                value={db_host}
                placeholder={trans.__('ip addr of db server')}    
                onChange={this._onChange('db_host')}
              />
              <Inp
                name={trans.__('PORT')}
                value={db_port}
                placeholder={trans.__('Leave blank to use default port.')}      
                onChange={this._onChange('db_port')}
              />
              <Inp
                name={trans.__('User')}
                value={db_user}
                placeholder={trans.__('Leave blank for user input.')}      
                onChange={this._onChange('db_user')}
              />
              <Inp
                name={trans.__('Pass')}
                value={db_pass}
                placeholder={trans.__('Leave blank for user input.')} 
                onChange={this._onChange('db_pass')}
              />
            </>
          )}
          <Inp
            name={trans.__('Database')}
            value={db_name}
            placeholder={trans.__('database/schema default connect to')}  
            onChange={this._onChange('db_name')}
          />
        </div>
      </div>
    );
  }

  private _onChange =
    (key: keyof IDBConn) =>
    (
      event:
        | React.ChangeEvent<HTMLInputElement>
        | React.ChangeEvent<HTMLSelectElement>
    ) => {
      this.setState({ [key]: event.target.value });
    };
}

export async function createNewConn(
  data: Partial<IDBConn>,
  model: SqlModel,
  trans: TranslationBundle
): Promise<void> {
  const result = await showDialog<IDBConn>({
    title: trans.__('Create New DB connection'),
    body: new ConnDialog(data as IDBConn, trans),
    hasClose: false,
    buttons: [
      Dialog.cancelButton(),
      Dialog.okButton({ label: trans.__('Submit') })
    ]
  });
  if (result.value) {
    model.add_conn(result.value);
  }
}
