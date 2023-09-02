import * as React from 'react';
import { showDialog, Dialog, ReactWidget } from '@jupyterlab/apputils';
import { TranslationBundle } from '@jupyterlab/translation';
import { IPass } from '../interfaces'

export function askPasswd(pass_info: IPass, trans:TranslationBundle) {
  const body = new AskPassDialog(pass_info, trans);

  const buttons = [
    Dialog.cancelButton(),
    Dialog.okButton({ label: trans.__('Submit') })
  ];

  showDialog({
    title: trans.__('Please input password'),
    body: body,
    buttons
  }).then(result => {
    if (result.button.label === 'Submit') {
      const value = result.value
      console.log('Submitted:', value);
    } else {
      console.log('Canceled');
    }
  });
}

class AskPassDialog extends ReactWidget {

    constructor(pass_info:IPass, trans:TranslationBundle) {
        super()
        this._pass_info=pass_info
        this._trans = trans
    }
    
    getValue(): IPass {
        return this.form.getValue()
    }

    render(): JSX.Element {
        const {db_id, db_user}=this._pass_info
        return <PassForm dialog={this} db_id={db_id} db_user={db_user} trans={this._trans}/>
    }

    public form!: PassForm;
    private _pass_info: IPass;
    private _trans: TranslationBundle;
}

interface IPassFormProps {
    dialog:AskPassDialog, 
    db_id:string, 
    trans:TranslationBundle,
    db_user?:string
}

class PassForm extends React.Component<IPassFormProps, Partial<IPass>>  {
  
    constructor(props:IPassFormProps) {
        super(props)
        this.state = { 
            db_id: this.props.db_id, 
            db_user: this.props.db_user, 
            db_pass:''
        };
    }
    
    getValue() : IPass {
        return this.state as IPass
    }

    render() {
        this.props.dialog.form=this
        let {db_user, db_pass}=this.state
        const {trans}=this.props
        return (
          <div style={{width:300}}>
            <div className='jp-InputGroup bp3-input-group'>
                <div>{trans.__('user')}</div>
                <input className='bp3-input'  value={db_user} 
                    onChange={this._onChange('db_user')}/>
                <div>{trans.__('pass')}</div>
                <input type='password' className='bp3-input'  value={db_pass} 
                    onChange={this._onChange('db_pass')}/>
            </div>
          </div>
        );
    }
    
    private _onChange = (key:keyof IPass) =>(event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({[key]: event.target.value});
    };
   
}