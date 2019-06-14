# tscer

[![CircleCI](https://circleci.com/gh/sonacy/tscer.svg?style=svg)](https://circleci.com/gh/sonacy/tscer)

> a project to transform jsx react components to tsx

## install

- npm i -g tscer

## usage

- tscer [js file you want to compile]
- tscer -D [dir you want to compile]
- tscer revert [ts file you want to revert]
- tscer -D [dir you want to revert]

## features

- generate IProps according to your PropTypes define
- generate IState according to your state define
- generate types for your plain js function
- generate redux connect to hoc functions
- add generic props to your component
