const vscode = require('vscode');
const { exec } = require('node:child_process');
const process = require('node:process');
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('lwrpublisher is active');
	const disposable = vscode.commands.registerCommand('lwrpublisher.publishStore', async function () {
		const storeName = vscode.workspace.getConfiguration('lwrpublisher').storeName;
		if(storeName == null || storeName == '') {
			vscode.window.showInformationMessage("Set Store Name in ext settings");
			return;
		}
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			cancellable: true,
			title: 'Publishing Store... '
		}, async (progress) => {
			let prog = 0;
			progress.report({  increment: prog });
			const outputString = '\"' + storeName + '\"';
			const output = await execShell('sf community publish --name ' + outputString);
			const backgroundOperationId = output.substring(output.indexOf("08P"), output.length - 1).trim();
			const queryString = '\"SELECT Status FROM BackgroundOperation WHERE Id = \'' + backgroundOperationId + '\'\"';
		
			progress.report({ increment: prog += 10 });

			let checkStatus = async () => {
				return await execShell('sf data query --query ' + queryString + ' --json');
			};
			let validateResult;
			let validate = result => {
				validateResult = JSON.parse(result).result.records[0].Status;
				console.log('Publish Status... ' + validateResult);
				progress.report({ increment: Math.min(prog += 5, 100) });
				if (validateResult == 'Complete') {
					return false;
				}
				else if (validateResult == 'Error') {
					return false;
				}
				return true;
			};
			await poll(checkStatus, validate, 5000);
			if (validateResult == 'Error') {
				vscode.window.showInformationMessage("Someone else is probably publishing. You're good");
			}
			else if (validateResult == 'Complete') {
				vscode.window.showInformationMessage("Store published!");
			}
			return;
		});
	});
	context.subscriptions.push(disposable);
}

const execShell = (cmd) =>
    new Promise((resolve, reject) => {
		let sh = true;
		if(process.platform === "win32") sh = 'powershell.exe';
		exec(cmd, { shell: sh }, (err, out) => {
            if (err) {
                return reject(err);
            }
            return resolve(out);
        });
    });

const poll = async function (fn, fnCondition, ms) {
	let result = await fn();
	while (fnCondition(result)) {
		await wait(ms);
		result = await fn();
	}
	return result;
	};
	  
const wait = function (ms = 1000) {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
	};

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
