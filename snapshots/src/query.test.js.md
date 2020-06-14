# Snapshot report for `src/query.test.js`

The actual snapshot is saved in `query.test.js.snap`.

Generated by [AVA](https://avajs.dev).

## Simple

> Snapshot 1

    [
      {
        args: [
          {
            definitions: [
              {
                kind: 'OperationDefinition',
                operation: 'query',
                selectionSet: {
                  kind: 'SelectionSet',
                  selections: [
                    {
                      alias: undefined,
                      arguments: [],
                      directives: [],
                      kind: 'Field',
                      loc: undefined,
                      name: {
                        kind: 'Name',
                        loc: undefined,
                        value: 'info',
                      },
                      selectionSet: undefined,
                    },
                  ],
                },
                variableDefinitions: [],
              },
            ],
            kind: 'Document',
          },
          {},
        ],
      },
    ]

## Simple two

> Snapshot 1

    [
      {
        args: [
          {
            definitions: [
              {
                kind: 'OperationDefinition',
                operation: 'query',
                selectionSet: {
                  kind: 'SelectionSet',
                  selections: [
                    {
                      alias: undefined,
                      arguments: [],
                      directives: [],
                      kind: 'Field',
                      loc: undefined,
                      name: {
                        kind: 'Name',
                        loc: undefined,
                        value: 'info',
                      },
                      selectionSet: undefined,
                    },
                    {
                      alias: undefined,
                      arguments: [],
                      directives: [],
                      kind: 'Field',
                      loc: undefined,
                      name: {
                        kind: 'Name',
                        loc: undefined,
                        value: 'another',
                      },
                      selectionSet: undefined,
                    },
                  ],
                },
                variableDefinitions: [],
              },
            ],
            kind: 'Document',
          },
          {},
        ],
      },
    ]

## Variables

> Snapshot 1

    [
      {
        args: [
          {
            definitions: [
              {
                kind: 'OperationDefinition',
                operation: 'query',
                selectionSet: {
                  kind: 'SelectionSet',
                  selections: [
                    {
                      alias: undefined,
                      arguments: [
                        {
                          kind: 'Argument',
                          loc: undefined,
                          name: {
                            kind: 'Name',
                            loc: undefined,
                            value: 'a',
                          },
                          value: {
                            kind: 'Variable',
                            loc: undefined,
                            name: {
                              kind: 'Name',
                              loc: undefined,
                              value: 'foo',
                            },
                          },
                        },
                      ],
                      directives: [],
                      kind: 'Field',
                      loc: undefined,
                      name: {
                        kind: 'Name',
                        loc: undefined,
                        value: 'info',
                      },
                      selectionSet: undefined,
                    },
                    {
                      alias: undefined,
                      arguments: [],
                      directives: [],
                      kind: 'Field',
                      loc: undefined,
                      name: {
                        kind: 'Name',
                        loc: undefined,
                        value: 'second',
                      },
                      selectionSet: {
                        kind: 'SelectionSet',
                        loc: undefined,
                        selections: [
                          {
                            alias: undefined,
                            arguments: [
                              {
                                kind: 'Argument',
                                loc: undefined,
                                name: {
                                  kind: 'Name',
                                  loc: undefined,
                                  value: 'bar',
                                },
                                value: {
                                  kind: 'Variable',
                                  loc: undefined,
                                  name: {
                                    kind: 'Name',
                                    loc: undefined,
                                    value: 'bar',
                                  },
                                },
                              },
                            ],
                            directives: [],
                            kind: 'Field',
                            loc: undefined,
                            name: {
                              kind: 'Name',
                              loc: undefined,
                              value: 'bar',
                            },
                            selectionSet: undefined,
                          },
                        ],
                      },
                    },
                    {
                      alias: {
                        kind: 'Name',
                        value: 'info_1',
                      },
                      arguments: [
                        {
                          kind: 'Argument',
                          loc: undefined,
                          name: {
                            kind: 'Name',
                            loc: undefined,
                            value: 'a',
                          },
                          value: {
                            kind: 'Variable',
                            loc: undefined,
                            name: {
                              kind: 'Name',
                              value: 'foo_1',
                            },
                          },
                        },
                      ],
                      directives: [],
                      kind: 'Field',
                      loc: undefined,
                      name: {
                        kind: 'Name',
                        loc: undefined,
                        value: 'info',
                      },
                      selectionSet: undefined,
                    },
                    {
                      alias: undefined,
                      arguments: [
                        {
                          kind: 'Argument',
                          loc: undefined,
                          name: {
                            kind: 'Name',
                            loc: undefined,
                            value: 'a',
                          },
                          value: {
                            kind: 'Variable',
                            loc: undefined,
                            name: {
                              kind: 'Name',
                              value: 'foo_1',
                            },
                          },
                        },
                      ],
                      directives: [],
                      kind: 'Field',
                      loc: undefined,
                      name: {
                        kind: 'Name',
                        loc: undefined,
                        value: 'another',
                      },
                      selectionSet: undefined,
                    },
                    {
                      alias: undefined,
                      arguments: [],
                      directives: [],
                      kind: 'Field',
                      loc: undefined,
                      name: {
                        kind: 'Name',
                        loc: undefined,
                        value: 'third',
                      },
                      selectionSet: {
                        kind: 'SelectionSet',
                        loc: undefined,
                        selections: [
                          {
                            alias: undefined,
                            arguments: [
                              {
                                kind: 'Argument',
                                loc: undefined,
                                name: {
                                  kind: 'Name',
                                  loc: undefined,
                                  value: 'baz',
                                },
                                value: {
                                  kind: 'Variable',
                                  loc: undefined,
                                  name: {
                                    kind: 'Name',
                                    loc: undefined,
                                    value: 'baz',
                                  },
                                },
                              },
                            ],
                            directives: [],
                            kind: 'Field',
                            loc: undefined,
                            name: {
                              kind: 'Name',
                              loc: undefined,
                              value: 'bar',
                            },
                            selectionSet: undefined,
                          },
                        ],
                      },
                    },
                  ],
                },
                variableDefinitions: [
                  {
                    defaultValue: undefined,
                    directives: [],
                    kind: 'VariableDefinition',
                    loc: undefined,
                    type: {
                      kind: 'NonNullType',
                      loc: undefined,
                      type: {
                        kind: 'NamedType',
                        loc: undefined,
                        name: {
                          kind: 'Name',
                          loc: undefined,
                          value: 'String',
                        },
                      },
                    },
                    variable: {
                      kind: 'Variable',
                      loc: undefined,
                      name: {
                        kind: 'Name',
                        loc: undefined,
                        value: 'foo',
                      },
                    },
                  },
                  {
                    defaultValue: undefined,
                    directives: [],
                    kind: 'VariableDefinition',
                    loc: undefined,
                    type: {
                      kind: 'NamedType',
                      loc: undefined,
                      name: {
                        kind: 'Name',
                        loc: undefined,
                        value: 'Int',
                      },
                    },
                    variable: {
                      kind: 'Variable',
                      loc: undefined,
                      name: {
                        kind: 'Name',
                        loc: undefined,
                        value: 'bar',
                      },
                    },
                  },
                  {
                    defaultValue: undefined,
                    directives: [],
                    kind: 'VariableDefinition',
                    loc: undefined,
                    type: {
                      kind: 'NamedType',
                      loc: undefined,
                      name: {
                        kind: 'Name',
                        loc: undefined,
                        value: 'String',
                      },
                    },
                    variable: {
                      kind: 'Variable',
                      loc: undefined,
                      name: {
                        kind: 'Name',
                        value: 'foo_1',
                      },
                    },
                  },
                  {
                    defaultValue: undefined,
                    directives: [],
                    kind: 'VariableDefinition',
                    loc: undefined,
                    type: {
                      kind: 'NamedType',
                      loc: undefined,
                      name: {
                        kind: 'Name',
                        loc: undefined,
                        value: 'Boolean',
                      },
                    },
                    variable: {
                      kind: 'Variable',
                      loc: undefined,
                      name: {
                        kind: 'Name',
                        loc: undefined,
                        value: 'baz',
                      },
                    },
                  },
                ],
              },
            ],
            kind: 'Document',
          },
          {
            baz: undefined,
            foo_1: undefined,
          },
        ],
      },
    ]