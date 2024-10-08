# Permissions

Allows you to check and repair your **linux filesystem file owners and access rights** daily,
using a single command line and a small configuration file describing your access policy.

## Install

You will need a recent version (18+) of [node.js](https://nodejs.org) to run this.

You don't need to install npm or dependencies for production.

```bash
git clone -b prod https://github.com/baptistepillot/permissions
````

## Configure

Create your own `permissions.txt` configuration file.

You can find an example and documentation in the [permissions-example.txt](permissions-example.txt) file.

**Warning:** Any incorrect configuration may result in your linux system becoming unusable!

## Run

To run the tool, use the following command:

```bash
node main
```

## Develop

Want to see the source code and develop?

### Install development environment

```bash
# if you have not already cloned the repo: clone it, or your fork:
git clone git@github.com:baptistepillot/permissions

# if you already got it
git checkout dev
```

### Deploy code to production

After you have commited and pushed your code from the `dev` branch, you may deploy your modifications to production:

```bash
./publish v1.0.4
```

The version number must be the next available one, either a major or minor version, depending on the type of update.

The branch named `prod` will be updated with the compiled version of your updated files.
