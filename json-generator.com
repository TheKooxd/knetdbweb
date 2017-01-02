[
  '{{repeat(1000, 1000)}}',
  {
    name: '{{firstName()}} {{surname()}}',
    id: '{{integer(1000,9999)}}',
    admin: '{{bool()}}',
    operator: '{{bool()}}',
    staff: '{{bool()}}',
    user: '{{bool()}}',
    group: 'undefined',
    picture: 'http://placehold.it/32x32',
    gsm: '{{phone()}}',
    email: '{{email()}}',
    pass: '26cebe840ae2a2aacee5',
    attention: "false",
    attentionReason: "false",
    attentionResponse: "false"
  }
]
