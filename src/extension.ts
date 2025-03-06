import * as vscode from 'vscode';
import * as crypto from 'crypto';

/* ------------------------------------------------------------------------- */
/*                                 Constants                                 */
/* ------------------------------------------------------------------------- */

const DEFAULT_ZAZ_CHANCE = 5; // 5% chance of ZAZ per line

const MIN_LINE_LENGTH = 10; // Minimum line length to apply Zaz (trimmed)

const ZAZ_MESSAGES = [
    'Surely you can't be serious? I am serious, and don't call me Shirley 👧',
    'Can you fly this airplane and land it? ✈️',
    "Don't you tell me which zone is for loading, and which zone is for stopping! 🔴",
    'Johnny, what can you make out of this?  This? Why, I can make a hat or a brooch or a pterodactyl 🐔',
    "Get me Rex Kramer! 💂‍♂️",
    'The tower, the tower! Rapunzel, Rapunzel! 🗼',
    "Chicago, this is flight two-zero-niner.  We're in trouble. 🔥",
    'Cold got to be! Y'know? ✊🏿',
    'I say hey, sky. Subba say I wan' see... 😰',
    'I just want to tell you both good luck. We're all counting on you... 🙈',
    "Looks like I picked the wrong week to quit sniffing glue... 😬",
];

/* ------------------------------------------------------------------------- */
/*                               Configuration                               */
/* ------------------------------------------------------------------------- */

let isSyntaxZazEnabled = true;
let zazChancePercentage = DEFAULT_ZAZ_CHANCE;

/* ------------------------------------------------------------------------- */
/*                             Global variables                              */
/* ------------------------------------------------------------------------- */

let decorationType: vscode.TextEditorDecorationType;

/* ------------------------------------------------------------------------- */
/*                            Extension functions                            */
/* ------------------------------------------------------------------------- */

export function activate(context: vscode.ExtensionContext) {
    // Create decoration type
    decorationType = vscode.window.createTextEditorDecorationType({
        textDecoration: 'none; border-bottom: 2px dotted rgb(213, 221, 107)',
        isWholeLine: false, // Only underline the actual code
    });

    let timeout: NodeJS.Timer | undefined = undefined;
    function triggerUpdateZazDecorations() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        timeout = setTimeout(updateZazDecorations, 500);
    }

    vscode.window.onDidChangeActiveTextEditor(
        () => {
            if (isSyntaxZazEnabled) {
                triggerUpdateZazDecorations();
            }
        },
        null,
        context.subscriptions,
    );

    vscode.workspace.onDidChangeTextDocument(
        () => {
            if (isSyntaxZazEnabled) {
                triggerUpdateZazDecorations();
            }
        },
        null,
        context.subscriptions,
    );

    // Register command to toggle the extension
    const disposable = vscode.commands.registerCommand('syntax-Zaz.toggle', () => {
        isSyntaxZazEnabled = !isSyntaxZazEnabled;
        if (isSyntaxZazEnabled) {
            vscode.window.showInformationMessage('Syntax Zaz enabled! Prepare to question everything...');
            triggerUpdateZazDecorations();
        } else {
            vscode.window.showInformationMessage('Syntax Zaz disabled. You can code in peace now.');
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                activeEditor.setDecorations(decorationType, []);
            }
        }
    });

    // Register command to change Zaz chance
    const changeChanceCommand = vscode.commands.registerCommand('syntax-Zaz.editChance', async () => {
        const result = await vscode.window.showInputBox({
            prompt: 'Enter the percentage chance of Zaz (1-100)',
            value: ZazChancePercentage.toString(),
            validateInput: (value: string) => {
                const num = parseInt(value);
                if (isNaN(num) || num < 1 || num > 100) {
                    return 'Please enter a number between 1 and 100';
                }
                return null;
            },
        });

        if (result !== undefined) {
            ZazChancePercentage = parseInt(result);
            vscode.window.showInformationMessage(`Zaz chance set to ${ZazChancePercentage}%`);
            triggerUpdateZazDecorations();
        }
    });

    context.subscriptions.push(disposable, changeChanceCommand);

    // Initial decorations
    if (vscode.window.activeTextEditor) {
        triggerUpdateZazDecorations();
    }
}

export function deactivate() {
    // Clean up decorations when deactivating
    if (vscode.window.activeTextEditor) {
        vscode.window.activeTextEditor.setDecorations(decorationType, []);
    }
}

/* ------------------------------------------------------------------------- */
/*                                 Functions                                 */
/* ------------------------------------------------------------------------- */

// Create a deterministic hash from a string
function createHash(str: string): string {
    return crypto.createHash('md5').update(str).digest('hex');
}

// Get deterministic message based on line content
function getZazMessageForLineContent(line: string): string | null {
    const hash = createHash(line);

    // Use first 8 chars for selection decision
    const selectionNum = parseInt(hash.substring(0, 8), 16);

    // Use last 8 chars for message selection
    const messageNum = parseInt(hash.substring(hash.length - 8), 16);

    // Use the first number to determine if we should show a message based on configured percentage
    if (selectionNum % 100 < ZazChancePercentage) {
        // Use the second number to select the message
        const messageIndex = messageNum % ZAZ_MESSAGES.length;
        return ZAZ_MESSAGES[messageIndex];
    }
    return null;
}

async function updateZazDecorations() {
    if (!isSyntaxZazEnabled) {
        return;
    }

    const activeEditor = vscode.window.activeTextEditor;

    if (!activeEditor) {
        return;
    }

    const document = activeEditor.document;
    const decorationsArray: vscode.DecorationOptions[] = [];

    // Parse the document line by line
    for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
        const line = document.lineAt(lineIndex);
        const trimmedLineText = line.text.trim();

        // Remove empty lines
        if (line.isEmptyOrWhitespace) {
            continue;
        }

        // Remove short lines
        if (trimmedLineText.length < MIN_LINE_LENGTH) {
            continue;
        }

        // Remove comments (Dummy comment detection)
        const isComment =
            trimmedLineText.startsWith('//') ||
            trimmedLineText.startsWith('#') ||
            trimmedLineText.startsWith('/*') ||
            trimmedLineText.startsWith('*') ||
            trimmedLineText.startsWith('<!--');
        if (isComment) {
            continue;
        }

        // Add Zaz message
        const message = getZazMessageForLineContent(trimmedLineText);
        if (message === null) {
            continue;
        }

        // Find the start of actual code (skip leading whitespace)
        const firstNonWhitespace = line.text.search(/\S/);
        if (firstNonWhitespace === -1) {
            continue;
        }

        const startPos = new vscode.Position(lineIndex, firstNonWhitespace);
        const endPos = new vscode.Position(lineIndex, line.text.length);

        const decoration = {
            range: new vscode.Range(startPos, endPos),
            hoverMessage: new vscode.MarkdownString(message),
        };

        decorationsArray.push(decoration);
    }

    activeEditor.setDecorations(decorationType, decorationsArray);
}
