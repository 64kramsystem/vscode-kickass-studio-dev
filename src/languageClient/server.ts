'use strict';

import * as fs from 'fs';

import { TextDocument, TextDocumentChangeEvent, Range, Location, DocumentUri } from 'vscode-languageclient';
import {
	createConnection,
	Diagnostic,
	DiagnosticSeverity,
	DidChangeConfigurationNotification,
	ProposedFeatures,
	TextDocuments,
} from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { ASMInfoAnalizer, ASMInfoError } from './kickassASMInfo';

const documentSettings = new Map();


const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments();
let globalSettings = {};

let hasConfigurationCapability = false;

const ASMAnalizer = new ASMInfoAnalizer();

connection.onInitialize(({ capabilities }) => {
	console.log("on initialize");


	hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
	return {
		capabilities: {
			textDocumentSync: documents.syncKind,
			definitionProvider: true
		}
	};
});

connection.onDefinition(( {textDocument, position}) => {
	const word = ASMAnalizer.getWord(textDocument.uri, position);
	if (!word) return null;
	const location = ASMAnalizer.getLabel(word);

	if (location) {
		return {uri: 'file://' + location.uri, range: location.range}
	}
	return null;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		connection.client.register(DidChangeConfigurationNotification.type);
	}
});

documents.onDidOpen((change: TextDocumentChangeEvent) => {
	validateDocument(change.document);
});

documents.onDidChangeContent((change: TextDocumentChangeEvent) => {
	validateDocument(change.document);
});

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		documentSettings.clear();
	} else {
		globalSettings = change.settings['kickass-studio'];
	}

	documents.all().forEach(validateDocument);
});

function getDocumentSettings(resource) {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}

	let result = documentSettings.get(resource);

	if (!result) {
		result = connection.workspace.getConfiguration({ scopeUri: resource, section: 'kickass-studio' });
		documentSettings.set(resource, result);
	}

	return result;
}


async function validateDocument(document: TextDocument) {

	const settings = await getDocumentSettings(document.uri);

	await ASMAnalizer.analize(document, settings);

	const errors = ASMAnalizer.getErrors();
	const fileName = URI.parse(document.uri).fsPath;

	connection.sendDiagnostics({ uri: document.uri, diagnostics: toDiagnosticErrors(fileName, errors) });
}

function toDiagnosticErrors(fileName:string, errors: ASMInfoError[]): Diagnostic[] {
	return errors.filter(({location}) => location.uri === fileName)
		.map(({message, location }) =>  ({
			severity: DiagnosticSeverity.Error,
			range: location.range,
			message,
			source: 'kickass-studio'
		})
	);
}

documents.listen(connection);
connection.listen();
