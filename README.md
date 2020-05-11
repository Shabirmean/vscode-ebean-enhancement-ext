# Java Ebean Enhancement 11 for VS Code

This extension provides bean enhancement for Ebean ORM based java projects. It acheives the same functionality as the [Ebean Enhance for IntelliJ IDEA](https://github.com/ebean-orm-tools/ebean-idea-enhancer). The ebean enhancement is commonly acheived by running any Ebean based java project against the `ebean java agent`. Thus, this extension acheives the functionality of installing the required `java agent` to the local VS Code storage and enabling users to setup specific run configurations to use this agent.

## Features

- Set up Ebean enhancement to any specific project in the current VS Code workspace
- Disable enhancement from any **worksapce + run configuration** you want
- If you workspace already has multiple run configurations, then choose the specific configuration to which you want to enable ebean enhancement
- Toggle between `Enable/Disable` from the command pallette 

![Settings menu](https://github.com/Shabirmean/vscode-ebean-enhancement-ext/tree/master/src/resources/settingsUi.png "Ebean Enhancement from the settings UI")

![Command Pallette](https://github.com/Shabirmean/vscode-ebean-enhancement-ext/tree/master/src/resources/commandPalette.png "Ebean Enhancement from the command pallette")


## Requirements

- VS Code: 1.45.0 or above

## Extension Settings

This extension contributes the following settings:

* `ebean.enhancement.enable`: enable/disable ebean enhancement

> Note: This extension setting is workspace folder specific. So each open workspace can have its own configuration for this setting in its `.vscode/settings.json`

## Known Issues

- If the current workspace already has multiple run configurations, then an option is provided to enable ebean enhancement to all of them. However, the implementation to this is yet to be completed. Currently only selection of individual configurations work.

## Release Notes


### 1.0.0

- Initial release of the Ebean Enhancer 11 for VS Code
- Supports setting up ebean enhancement to speciifc workspacess if multiple are open
- Supports setting up ebean enhancement to specific run configuration if multiple configurations are setup

## Issues and request

Submit your issues and requests [here](https://github.com/Shabirmean/vscode-ebean-enhancement-ext/issues)

## Acknowledgements

- The authors of the Ebean Enhancement plugin for IntelliJ _(the functionality was reversed engineered from their source code)_
- The [Ebean-ORM](https://github.com/ebean-orm/ebean-orm.github.io) website source _(the icon for the extension is fetched from here)_