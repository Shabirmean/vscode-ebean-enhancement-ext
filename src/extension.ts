import * as vscode from 'vscode';

const Msg = {
	NO_FOLDER_OPEN: 'Failed to enable ebean enhancement. You must have a workspace setup by openning a folder to enable Ebean Enhancement',
	NO_VAID_WS_FOLDER: 'Failed to enable ebean enhancement. No valid workspace selected to enable Ebean Enhancement',
	PICK_A_WS_FOLDER: 'Select the workspace in which you want Ebean Enhancement to be enabled',
	LAUNCH_JSON_CREATE_FAIL: 'Failed to enable ebean enhancement. Could not create launch.json in workspace at: ',
	EBEAN_ENABLED: 'Ebean Enhancement has been enabled',
	EBEAN_ALREADY_ENABLED: 'Ebean Enhancement is already enabled for this workspace',
	MAIN_CLASS: 'Provide a main class to set for the launch configuration',
	MAIN_CLASS_PROMPT: 'Main calss',
	SELECT_LAUNCH_CONFIG: 'Select the configuration to apply ebean enhancement to',
	SETTING_NEW_CONFIG: 'The selected configuration was invalid. Setting up a new one...',
	SETTING_EMPTY_MAIN_CLASS: 'Provided mainClass was invalid. Creating ebean enhancement configuration with empty mainClass. Please update it!'
}

const JAVA = 'java';
const ENHANCE_ALL = 'Enhance all';
const _vscode = '.vscode';
const _launch = 'launch';
const _launchJson = `${_launch}.json`;
const _vmArgRegex = /^-javaagent:.*ebean-agent.*\.jar$/;

export function activate(context: vscode.ExtensionContext) {
	let ebeanEnhance = vscode.commands.registerCommand('ebean.enableEnhancement', async () => {
		let created = false;
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
		const enabled = vscode.workspace.getConfiguration().get('ebean.enhancement.enable', wsUri);
		const wsroot = wsUri.fsPath;
		const wsEdit = new vscode.WorkspaceEdit();
		wsEdit.createFile(vscode.Uri.file(`${wsroot}/${_vscode}`), { ignoreIfExists: true });
		wsEdit.createFile(vscode.Uri.file(`${wsroot}/${_vscode}/${_launchJson}`), { ignoreIfExists: true });
		created = await vscode.workspace.applyEdit(wsEdit);

		if (!created) {
			vscode.window.showErrorMessage(Msg.LAUNCH_JSON_CREATE_FAIL + wsroot);
			return;
		}
		
		if (!enabled) {
			await vscode.workspace.getConfiguration(undefined, _ws).update('ebean.enhancement.enable', true, vscode.ConfigurationTarget.WorkspaceFolder);
		} else {
			vscode.window.showWarningMessage(Msg.EBEAN_ALREADY_ENABLED);
			return;
		}
		
		const wsConfigs = vscode.workspace.getConfiguration(_launch, _ws);
		const update = await updateConfigurations(wsConfigs, _ws);
		const updatedConfigs = update.config;
		const setupNew = update.setupStatus;
		
		let updatedLaunch = { ...wsConfigs, 'configurations': updatedConfigs };
		if (setupNew) {
			const inputOptions : vscode.InputBoxOptions = { 
				placeHolder: Msg.MAIN_CLASS, prompt: Msg.MAIN_CLASS_PROMPT, ignoreFocusOut: true, validateInput: validateMainClass };
			const _mainClass : string | undefined = await vscode.window.showInputBox(inputOptions);
			if (!_mainClass) vscode.window.showWarningMessage(Msg.SETTING_EMPTY_MAIN_CLASS);
			const newConfig : ConfigurationObject = addJavaAgentVmArg(new ConfigurationObject().of('Ebean enhanced configuration', _mainClass || '', []));
			updatedLaunch.configurations = [newConfig];
		}
		const confEdit = new vscode.WorkspaceEdit();
		const launchJson = JSON.stringify(updatedLaunch, null, 2);
		const start : vscode.Position = new vscode.Position(0, 0);
		const end : vscode.Position = new vscode.Position(0, launchJson.length);
		confEdit.replace(vscode.Uri.file(`${_ws.uri.fsPath}/${_vscode}/${_launchJson}`), new vscode.Range(start, end), launchJson);
		await vscode.workspace.applyEdit(confEdit);
		await vscode.workspace.saveAll(true);

		if (enabled) {
			vscode.window.showInformationMessage(Msg.EBEAN_ENABLED);
		}
	});

	context.subscriptions.push(ebeanEnhance);
}

// this method is called when your extension is deactivated
export function deactivate() {
	vscode.window.showErrorMessage('You must have a workspace setup by openning a folder to ebanle Ebean Enhancement');
}


async function updateConfigurations(wsConfig : vscode.WorkspaceConfiguration, _ws : vscode.WorkspaceFolder) {
	let setupNew : boolean = false;
	let updatedConfigs : ConfigurationObject[] = [];
	const launchConfigs = wsConfig.configurations;

	if (launchConfigs && launchConfigs.length !== 0) {
		type ConfigMap = Record<string, ConfigurationObject>;
		let configMap : ConfigMap = {};
		launchConfigs.forEach((curr : ConfigurationObject) => {
			if (curr.name && curr.type && curr.type === JAVA) {
				configMap[curr.name] = curr;
			} else {
				updatedConfigs.push(curr);
			}
		});

		const validConfigs = Object.keys(configMap);
		let updated : ConfigurationObject;
		if (validConfigs.length === 1) {
			updated = addJavaAgentVmArg(configMap[validConfigs[0]]);

		} else if (validConfigs.length > 1) {
			// TODO:: Handle all config change
			validConfigs.push(ENHANCE_ALL);
			const ebeanConfig = await vscode.window.showQuickPick(validConfigs, { ignoreFocusOut: true, placeHolder: Msg.SELECT_LAUNCH_CONFIG });
			if (ebeanConfig) {
				updated = addJavaAgentVmArg(configMap[ebeanConfig]);

			} else {
				vscode.window.showWarningMessage(Msg.SETTING_NEW_CONFIG);
				setupNew = true;
			}
		}

		Object.keys(configMap).forEach((c : string) => {
			if (updated && updated.name == configMap[c].name) {
				updatedConfigs.push(updated);
			} else {
				updatedConfigs.push(configMap[c]);
			}
		});
	} else {
		setupNew = true;
	}
	await refreshLaunchFile(_ws);
	return { config: updatedConfigs, setupStatus: setupNew };
}


function addJavaAgentVmArg(config : ConfigurationObject) {
	if (!config.vmArgs) {
		config.vmArgs = [];
	}
	let hasArg = false;
	config.vmArgs.forEach((arg) => hasArg = hasArg || _vmArgRegex.test(arg) );
	if (!hasArg) {
		config.vmArgs.push("-javaagent:/Users/shabirmean/Library/Application Support/IntelliJIdea2019.3/ebean-idea/lib/ebean-agent-12.1.8.jar");
	} else {
		vscode.window.showInformationMessage('Ebean Enhancement is already enabled for the selected workspace configuration');
	}
	return config;
}

async function validateMainClass(inputClass : string) {
	// method must return undefined if the input is valid
	const classPath = inputClass.split('.').join('/');
	const mcUri : vscode.Uri[] = await vscode.workspace.findFiles(`**/${classPath}.java`, '**/target/**', 10);
	return (mcUri.length == 0) ? `No java file with name ${inputClass} was found` : undefined;
}

async function refreshLaunchFile(_ws : vscode.WorkspaceFolder) {
	const refreshFile = new vscode.WorkspaceEdit();
	refreshFile.createFile(vscode.Uri.file(`${_ws.uri.fsPath}/${_vscode}/${_launchJson}`), { overwrite: true });
	await vscode.workspace.applyEdit(refreshFile);
}


class ConfigurationObject {
	name : string | undefined;
	request : string | undefined;
	type : string | undefined;
	mainClass : string | undefined;
	vmArgs : string[] | undefined;

	of(name : string, mainClass : string, vmArgs : string[]) : ConfigurationObject {
		this.name = name;
		this.mainClass = mainClass;
		this.vmArgs = vmArgs;
		this.type = JAVA;
		this.request = _launch;
		return this;
	}
}