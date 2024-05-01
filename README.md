[![Github Actions Status](https://github.com/groupnotes/jupyterlab-sql-explorer/actions/workflows/build.yml/badge.svg)](https://github.com/groupnotes/jupyterlab-sql-explorer/actions/workflows/build.yml)

# jupyterlab-sql-explorer

jupyterlab-sql-explorer is an extensible JupyterLab plugin that enables users to run SQL statements and navigate database objects within JupyterLab. Here are its main features:

- Browse and navigate data objects such as tables and views using a tree structure. This capability is particularly useful for data analysts who need to understand the underlying data organization.

- Run SQL statements directly in JupyterLab and view the returned results.

- Support for multiple databases, including MySQL, PostgreSQL, Hive, SQLite, ORACLE, and more.

- Edit annotations for data objects and support for both local and shared modes. With jupyterlab-sql-explorer, users can add annotations to data objects such as tables and views. This feature is especially valuable for data analysts working in teams, as it facilitates collaboration and knowledge sharing around specific data assets.

![screenshot](https://raw.githubusercontent.com/groupnotes/jupyterlab-sql-explorer/main/preview.gif)

## Usage

### Add Database Connction

When using for the first time, open the dialog box to add a data connection by selecting "Database->New Connection" from the menu.

### Edit Comments:

To edit the comments of data objects, you can right-click on the corresponding connection, table, or column in the database navigation tree and select the "Edit Comment" option. This will open an editing box that allows you to add or modify the comment content.

### Share Comments:

By default, comments are saved locally. If you need to share comments within a team, you must follow these steps:

In $HOME/.jupyter/jupyter_notebook_config.py (on Windows %USERPROFILE%/.jupyter/jupyter_notebook_config.py), add or modify the following line:

```python
c.JupyterLabSqlExplorer.comments_store = 'database::your_database_connection_string'
```

Replace 'your_database_connection_string' with the database connection string you have configured. For example, if you are using a MySQL database, the connection string may look like this:

```python
c.JupyterLabSqlExplorer.comments_store = 'database::mysql+pymysql://root:12345@192.168.1.100:3306/data'
```

This will store the comments in a MySQL database. You can choose to use other types of databases as needed.

Ensure that each team member follows the steps mentioned above to modify the configuration and restart. This will enable the sharing of comments among team members.

## Requirements

- JupyterLab >= 4.0 : for JupyterLab 3.x please use version 0.1.x
- sqlalchemy >1.4

## Install

To install the extension, execute:

```bash
pip install jupyterlab-sql-explorer
```

or install with special database driver,

```bash
pip install jupyterlab-sql-explorer[hive]
```

## Uninstall

To remove the extension, execute:

```bash
pip uninstall jupyterlab-sql-explorer
```

## Troubleshoot

If you are seeing the frontend extension, but it is not working, check
that the server extension is enabled:

```bash
jupyter server extension list
```

If the server extension is installed and enabled, but you are not seeing
the frontend extension, check the frontend extension is installed:

```bash
jupyter labextension list
```

## Contributing

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the jupyterlab-sql-explorer directory
# Install package in development mode
pip install -e ".[test]"
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Server extension must be manually installed in develop mode
jupyter server extension enable jupyterlab-sql-explorer
# Rebuild extension Typescript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Development uninstall

```bash
# Server extension must be manually disabled in develop mode
jupyter server extension disable jupyterlab-sql-explorer
pip uninstall jupyterlab-sql-explorer
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `jupyterlab-sql-explorer` within that folder.

### Testing the extension

#### Server tests

This extension is using [Pytest](https://docs.pytest.org/) for Python code testing.

Install test dependencies (needed only once):

```sh
pip install -e ".[test]"
# Each time you install the Python package, you need to restore the front-end extension link
jupyter labextension develop . --overwrite
```

To execute them, run:

```sh
pytest -vv -r ap --cov jupyterlab-sql-explorer
```

#### Frontend tests

This extension is using [Jest](https://jestjs.io/) for JavaScript code testing.

To execute them, execute:

```sh
jlpm
jlpm test
```

#### Integration tests

This extension uses Playwright for the integration tests (aka user level tests).
More precisely, the JupyterLab helper [Galata](https://github.com/jupyterlab/jupyterlab/tree/master/galata) is used to handle testing the extension in JupyterLab.

More information are provided within the [ui-tests](./ui-tests/README.md) README.

### Packaging the extension

See [RELEASE](RELEASE.md)
