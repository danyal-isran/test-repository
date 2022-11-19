# UAR - Integrations - Command Line

The project is a command line interface which interacts with Upstart Auto Retail Backend API to automate common workflows like creating a deal from an existing payload.

## Getting Started

### Executable

Update your npm registry to use Upstart's JFrog Artifactory. Instruction can be found [here](#how-do-i-configure-upstart-jfrog-artificatory)
Make sure you have installed `npx` by running `npm i npx -g`

Run `npm install uar-cli -g` to install it globally

Execute command line by executing `uar-cli`

After installing, revert back to previous registry, so other projects like backend are not impacted

![alt text](https://github.com/danyal-isran/test-repository/blob/main/cli.png "cli")

### Development

- Clone git repository using `git clone`
- Install any dependencies using `npm install`
- Run `npm run start` in project root directory

## Dependencies

- Node (16)
- Access to UAR Backend API (https://testing-api.getprodigy.com/meta)

## Supported Operations

Currently, `uar-cli` supports following operations:

| -                        | Description                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Create Deal              | Create a deal with dealer, applicant, trade, car , financeType & selected offer. Allows option to forward to CRM. |
| Create Deal From Payload | Create a deal from an existing `JSON` payload in `./tests` directory. Allows option to forward to CRM.            |

We plan to support more operations. If you are interested in contributing, please feel free to create a pull request.

## Frequently Asked Questions

**Q:** Why Standalone? Why not just create a script in `backend`?

This intended audience for this project is for all of engineering including QA. Not everyone has access & knows how to compile and execute scripts on `backend`.

As we merge with Auto Retail Lending & broader engineering teams at Upstart, this tool will allow others to to become familiar with our system.

It will help us catch any issues with our backend as we start to consume our own API route endpoints.

##

**Q:** Why use Node.JS ?

We constantly update [Harmony](https://github.com/getprodigy/harmony) with new types & business logic. It's easier to maintain a project if we use an updated depdendency. This also gives us opportunity to move logic into harmony, so all clients (cli, online, web, papyrus) behave consistently.

##

**Q:** Why not use Postman Collections?

We could use Postman collections, You would have to know sequence of http requests to create a deal. Follow-up requests require authorization state. We also lack Postman licenses, so distributing across the team makes it difficult. With command line, we have the ability to automate common developer tasks beyond just deal creation like synchronizing db against other environments.

##

**Q:** Can I contribute to this project?

Yes. Create a pull request and it will be reviewed by a codeowner.

##

**Q:** How do I report issues?

Create a Github issue, and it will be looked at by one of the codeowners.

## How do I configure Upstart JFrog Artificatory?

You will need Artifactory access in [Okta](https://upstart.okta.com/app/UserHome) for this to be able to work.

- Update your NPM registry 
`npm config set registry https://upstart.jfrog.io/artifactory/api/npm/npm` 

- Authenticate
`npm login`

- To find your artifactory credentials:
Navigate to https://upstart.okta.com/app/UserHome

- Select “Artifactory” 
Click your name in the top right hand corner (note, this is your username)

- Click “Edit Profile”

- Copy your API Key (This is your password)

Further instructions can be found here: https://upstartnetwork.atlassian.net/wiki/spaces/ENG/pages/632259484/Setup+Artifactory#NPM-%2F-Yarn
