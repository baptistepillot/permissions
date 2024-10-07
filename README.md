# Permissions

Allows you to check and repair your **linux filesystem file owners and access rights** daily,
using a single command line and a small configuration file describing your access policy.

## Install

You will need a recent version (18+) of [node.js](https://nodejs.org) to run this.

You don't need to install npm or dependencies for production run.

## Configure

Create your own `permissions.txt` configuration file.

You can find an example and documentation in the [permissions-example.txt](permissions-example.txt) file.

**Warning:** Any incorrect configuration may result in your linux system to become unusable!

## Run

To run the tool, use the following command:

```bash
node main
```
