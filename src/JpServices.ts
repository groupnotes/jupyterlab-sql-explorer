import { JupyterFrontEnd } from '@jupyterlab/application';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { TranslationBundle } from '@jupyterlab/translation';

export interface IJpServices {
    app: JupyterFrontEnd,
    editorService: IEditorServices, 
    trans: TranslationBundle
}