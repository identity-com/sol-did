oclif-hello-world
=================

oclif example Hello World CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![License](https://img.shields.io/npm/l/oclif-hello-world.svg)](https://github.com/oclif/hello-world/blob/main/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @identity.com/sol-did-cli
$ sol COMMAND
running command...
$ sol (--version)
@identity.com/sol-did-cli/0.0.0 darwin-arm64 node-v16.13.0
$ sol --help [COMMAND]
USAGE
  $ sol COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`sol hello PERSON`](#sol-hello-person)
* [`sol hello world`](#sol-hello-world)
* [`sol help [COMMAND]`](#sol-help-command)
* [`sol plugins`](#sol-plugins)
* [`sol plugins:install PLUGIN...`](#sol-pluginsinstall-plugin)
* [`sol plugins:inspect PLUGIN...`](#sol-pluginsinspect-plugin)
* [`sol plugins:install PLUGIN...`](#sol-pluginsinstall-plugin-1)
* [`sol plugins:link PLUGIN`](#sol-pluginslink-plugin)
* [`sol plugins:uninstall PLUGIN...`](#sol-pluginsuninstall-plugin)
* [`sol plugins:uninstall PLUGIN...`](#sol-pluginsuninstall-plugin-1)
* [`sol plugins:uninstall PLUGIN...`](#sol-pluginsuninstall-plugin-2)
* [`sol plugins update`](#sol-plugins-update)

## `sol hello PERSON`

Say hello

```
USAGE
  $ sol hello [PERSON] -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Whom is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ oex hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [dist/commands/hello/index.ts](https://github.com/identity-com/sol-did/blob/v0.0.0/dist/commands/hello/index.ts)_

## `sol hello world`

Say hello world

```
USAGE
  $ sol hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ oex hello world
  hello world! (./src/commands/hello/world.ts)
```

## `sol help [COMMAND]`

Display help for sol.

```
USAGE
  $ sol help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for sol.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.10/src/commands/help.ts)_

## `sol plugins`

List installed plugins.

```
USAGE
  $ sol plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ sol plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.0.11/src/commands/plugins/index.ts)_

## `sol plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ sol plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.

  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ sol plugins add

EXAMPLES
  $ sol plugins:install myplugin 

  $ sol plugins:install https://github.com/someuser/someplugin

  $ sol plugins:install someuser/someplugin
```

## `sol plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ sol plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ sol plugins:inspect myplugin
```

## `sol plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ sol plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.

  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ sol plugins add

EXAMPLES
  $ sol plugins:install myplugin 

  $ sol plugins:install https://github.com/someuser/someplugin

  $ sol plugins:install someuser/someplugin
```

## `sol plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ sol plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.

EXAMPLES
  $ sol plugins:link myplugin
```

## `sol plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ sol plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ sol plugins unlink
  $ sol plugins remove
```

## `sol plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ sol plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ sol plugins unlink
  $ sol plugins remove
```

## `sol plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ sol plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ sol plugins unlink
  $ sol plugins remove
```

## `sol plugins update`

Update installed plugins.

```
USAGE
  $ sol plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```
<!-- commandsstop -->
