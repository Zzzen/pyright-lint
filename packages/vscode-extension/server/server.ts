/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
  InitializeResult,
  WorkspaceFolder,
  TextDocumentPositionParams,
  CompletionItem,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

import { Linter } from "pyright-lint/dist/linter";

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
// let hasDiagnosticRelatedInformationCapability = false;

/**
 * key contains uri scheme, e.g. file://
 */
const rootToLinter = new Map<string, Linter>();

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  // hasDiagnosticRelatedInformationCapability = !!(
  //   capabilities.textDocument &&
  //   capabilities.textDocument.publishDiagnostics &&
  //   capabilities.textDocument.publishDiagnostics.relatedInformation
  // );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
    },
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((event) => {
      connection.console.log("Workspace folder change event received.");
      event.removed.forEach((folder) => {
        const linter = rootToLinter.get(folder.uri);
        if (linter) {
          linter.dispose();
          rootToLinter.delete(folder.uri);
        }
      });
      event.added.forEach((folder) => {
        initLinter(folder);
      });
    });
  }
  connection.workspace.getWorkspaceFolders().then((folders) => {
    folders?.forEach((folder) => {
      initLinter(folder);
    });
    documents.all().forEach(validateTextDocument);
  });
});

function initLinter(folder: WorkspaceFolder) {
  if (!folder.uri.startsWith("file://")) {
    return;
  }
  connection.console.log("Adding linter for " + folder.uri);
  const linter = new Linter({
    projectRoot: withoutUriScheme(folder.uri),
  });
  rootToLinter.set(folder.uri, linter);
  return linter;
}

// The example settings
interface ExampleSettings {
  maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
// const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
// let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration((_change) => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    // globalSettings = <ExampleSettings>(
    //   (change.settings.languageServerExample || defaultSettings)
    // );
  }

  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument);
});

// function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
//   if (!hasConfigurationCapability) {
//     return Promise.resolve(globalSettings);
//   }
//   let result = documentSettings.get(resource);
//   if (!result) {
//     result = connection.workspace.getConfiguration({
//       scopeUri: resource,
//       section: "languageServerExample",
//     });
//     documentSettings.set(resource, result);
//   }
//   return result;
// }

// Only keep settings for open documents
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri);

  const linter = getLinterByFilePath(e.document.uri);
  if (linter) {
    linter.setFileClose(withoutUriScheme(e.document.uri));
  }
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
  // TODO: linter might not be ready yet when file is opened the first time
  const linter = getLinterByFilePath(change.document.uri);
  if (!linter) {
    return;
  }
  linter.setFileOpen(
    withoutUriScheme(change.document.uri),
    change.document.version,
    change.document.getText()
  );
  validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const linter = getLinterByFilePath(textDocument.uri);
  if (linter) {
    linter.setFileOpen(
      withoutUriScheme(textDocument.uri),
      textDocument.version,
      textDocument.getText()
    );
  }
  connection.console.log(
    "validateTextDocument: " + textDocument.uri + " linter: " + !!linter
  );
  const errors = linter?.lintFile(withoutUriScheme(textDocument.uri));

  if (!errors?.length) {
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
    return;
  }

  const diagnostics: Diagnostic[] = errors.map((error) => {
    return {
      severity: DiagnosticSeverity.Warning,
      range: {
        start: textDocument.positionAt(error.textRange.start),
        end: textDocument.positionAt(
          error.textRange.start + error.textRange.length
        ),
      },
      message: error.message,
      source: "pyright-lint",
    };
  });

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles((_change) => {
  // Monitored files have change in VSCode
  connection.console.log("We received an file change event");
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    // The pass parameter contains the position of the text document in
    // which code complete got requested. For the example we ignore this
    // info and always provide the same completion items.
    return [];
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  return item;
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

connection.console.log("server started");

function getLinterByFilePath(uri: string) {
  const root = Array.from(rootToLinter.keys()).find((x) => uri.startsWith(x));
  if (!root) {
    connection.console.log("No linter found for " + uri);
    return;
  }
  return rootToLinter.get(root);
}

function withoutUriScheme(uri: string) {
  return uri.replace("file://", "");
}
