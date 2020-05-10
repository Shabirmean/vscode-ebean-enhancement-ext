import * as vscode from 'vscode';
import {
	Msg,
	writeUpdates,
	removeEbeanEnhancement,
	updateConfigurations,
	validateMainClass,
	addJavaAgentVmArg,
	ConfigurationObject } from './utils';

const _vscode = '.vscode';
const _launch = 'launch';
const _launchJson = `${_launch}.json`;

export function activate(context: vscode.ExtensionContext) {
	const enableEbeanEnhance = vscode.commands.registerCommand('ebean.enableEnhancement', async () => {
		const wsf = vscode.workspace.workspaceFolders;
		if (!wsf) {
			vscode.window.showErrorMessage(Msg.NO_FOLDER_OPEN);
			return;
		}

		const _ws : vscode.WorkspaceFolder | undefined = wsf.length === 1 ?
			wsf[0] : await vscode.window.showWorkspaceFolderPick({ placeHolder: Msg.PICK_A_WS_FOLDER, ignoreFocusOut: true });
		if (!_ws) {
			vscode.window.showErrorMessage(Msg.NO_VAID_WS_FOLDER);
			return;
		}

		const wsUri : vscode.Uri = _ws.uri;
		const enabled = vscode.workspace.getConfiguration(undefined, _ws).get('ebean.enhancement.enable', wsUri);
		if (!enabled) {
			const wsroot = wsUri.fsPath;
			const wsEdit = new vscode.WorkspaceEdit();
			wsEdit.createFile(vscode.Uri.file(`${wsroot}/${_vscode}`), { ignoreIfExists: true });
			wsEdit.createFile(vscode.Uri.file(`${wsroot}/${_vscode}/${_launchJson}`), { ignoreIfExists: true });
			const created = await vscode.workspace.applyEdit(wsEdit);
			if (!created) {
				vscode.window.showErrorMessage(Msg.LAUNCH_JSON_CREATE_FAIL + wsroot);
				return;
			}
			await vscode.workspace.getConfiguration(undefined, _ws).update('ebean.enhancement.enable', true, vscode.ConfigurationTarget.WorkspaceFolder);
		} else {
			vscode.window.showWarningMessage(Msg.EBEAN_ALREADY_ENABLED);
		}
	});

	const disableEbeanEnhance = vscode.commands.registerCommand('ebean.disableEnhancement', async () => {
		const wsf = vscode.workspace.workspaceFolders;
		if (!wsf) {
			return;
		}

		const _ws : vscode.WorkspaceFolder | undefined = wsf.length === 1 ?
			wsf[0] : await vscode.window.showWorkspaceFolderPick({ placeHolder: Msg.PICK_A_WS_FOLDER_DISBALE, ignoreFocusOut: true });
		if (!_ws) {
			vscode.window.showErrorMessage(Msg.NO_VAID_WS_FOLDER_DISABLE);
			return;
		}

		const wsUri : vscode.Uri = _ws.uri;
		const enabled = vscode.workspace.getConfiguration(undefined, _ws).get('ebean.enhancement.enable', wsUri);
		if (enabled) {
			await vscode.workspace.getConfiguration(undefined, _ws).update('ebean.enhancement.enable', false, vscode.ConfigurationTarget.WorkspaceFolder);
		} else {
			vscode.window.showWarningMessage(Msg.EBEAN_ALREADY_DISABLED);
		}
	});

	const ebeanEnhancementChangeEvent = vscode.workspace.onDidChangeConfiguration(async (e) => {
		const wsf = vscode.workspace.workspaceFolders;
		if (!wsf) return;
		if (wsf.length == 0) return;

		wsf.forEach(async (_ws) => {
			if (e.affectsConfiguration('ebean.enhancement.enable', _ws)) {
				const ebeanEnable = vscode.workspace.getConfiguration(undefined, _ws).get('ebean.enhancement.enable', _ws.uri);
				const wsConfigs = vscode.workspace.getConfiguration(_launch, _ws);
				const update = ebeanEnable ? await updateConfigurations(wsConfigs, _ws) : await removeEbeanEnhancement(wsConfigs, _ws);
				const updatedConfigs : ConfigurationObject[] = update.config;
				const shouldUpdate : boolean = update.status;
				let updatedLaunch = { ...wsConfigs, 'configurations': updatedConfigs };

				if (ebeanEnable) {
					if (shouldUpdate) {
						const inputOptions : vscode.InputBoxOptions = { 
							placeHolder: Msg.MAIN_CLASS, prompt: Msg.MAIN_CLASS_PROMPT, ignoreFocusOut: true, validateInput: validateMainClass };
						const _mainClass : string | undefined = await vscode.window.showInputBox(inputOptions);
						if (!_mainClass) vscode.window.showWarningMessage(Msg.SETTING_EMPTY_MAIN_CLASS);
						const newConfig : ConfigurationObject = addJavaAgentVmArg(new ConfigurationObject('Ebean enhanced configuration', _mainClass || '', []));
						updatedLaunch.configurations = [newConfig];
					}
					await writeUpdates(updatedLaunch, _ws);
					vscode.window.showInformationMessage(Msg.EBEAN_ENABLED);
				} else {
					if (shouldUpdate) {
						await writeUpdates(updatedLaunch, _ws);
						vscode.window.showInformationMessage(Msg.EBEAN_DISABLED);
					}
				}
			}
		});
	});

	context.subscriptions.push(enableEbeanEnhance);
	context.subscriptions.push(disableEbeanEnhance);
	context.subscriptions.push(ebeanEnhancementChangeEvent);
}

// this method is called when your extension is deactivated
export function deactivate() {
	vscode.window.showErrorMessage('You must have a workspace setup by openning a folder to ebanle Ebean Enhancement');
}