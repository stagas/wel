export default function parse ({ start, peek, accept, expect }) {
  // function error (token, message) {
  //   return new TypeError(message
  //     + ': ' + token.value
  //     + '\n  at position: ' + token.index)
  // }
  const encoder = new TextEncoder('utf-8')

  // TODO: replace with a real implementation
  function parseDataString () {
    const parsed = []
    while (1) {
      const str = accept('string')
      if (!str) break

      if (str.value[0] === '\\' && str.value[1].match(/[0-9a-f]/i)) {
        const match = str.value.matchAll(/\\([0-9a-f]{1,2})/gi)
        for (const m of match) {
          parsed.push(parseInt(m[1], 16))
        }
      }
      else {
        str.value = str.value.replace(/\\n/, '\n')
        parsed.push(...encoder.encode(str.value))
      }
    }

    return parsed
  }

  function* params () {
    let param
    while (1) {
      if (param = accept('number')) {
        param.value = param.value.replace(/_/g, '')
        yield { param }
        continue
      }
      if (param = accept('hex')) {
        param.value = param.value.replace(/_/g, '')
        yield { param }
        continue
      }
      if (param = accept('string')) {
        yield { param }
        continue
      }
      if (param = accept('label')) {
        yield { param }
        continue
      }
      if (param = accept('param')) {
        let value
        if (value = accept('number')) {
          yield { param, value }
          continue
        }
        if (value = accept('hex')) {
          yield { param, value }
          continue
        }
        else {
          yield { param }
          continue
        }
      }
      break
    }
  }

  function expr () {
    const ref = accept('label')
    if (ref) return { ref }

    if (peek('string')) { // TODO: handle utf-8 strings
      return { data: parseDataString() }
    }

    const sexpr = accept('lparen')

    let instr
    if (sexpr) {
      instr = expect('instr')
    }
    else {
      instr = accept('instr')
      if (!instr) return
    }

    const node = {
      instr,
      name: accept('label'),
      params: [...params()],
      children: []
    }

    if (sexpr) {
      let child

      while (!peek('eof') && (child = expr())) {
        node.children.push(child)
      }

      node.params.push(...params()) // can have params after children..

      expect('rparen')
    }
    else if (instr.value === 'block' || instr.value === 'loop') {
      let child

      while (!peek('eof') && (!peek('instr','end')) && (child = expr())) {
        node.children.push(child)
      }

      expect('instr','end')
    }

    return node
  }

  start()

  return expr()
}
