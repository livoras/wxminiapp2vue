interface IToken {
  type: TOKEN_NAME,
  value: string,
}

const enum TOKEN_NAME {
  START_TAG,
  TAG_NAME,
  KEY,
  EQUAL,
  VALUE,
  END_TAG,
}

const tokenizer = (tagStr: string) => {
  const tokens: IToken[] = []
  let token = ""
  let strTokenStart = "" // \" | \'
  let isInString = false

  const addKeyToken = () => {
    if (token.length !== 0) {
      tokens.push({ type: TOKEN_NAME.KEY, value: token })
      token = ""
    }
  }

  for (let i = 0; i < tagStr.length; i++) {
    const ch = tagStr[i]

    if (tokens.length === 0 && ch === '<') {
      tokens.push({ type: TOKEN_NAME.START_TAG, value: ch })
    } else if (tokens.length === 1) {
      if (ch.match(/\s/)) {
        if (token.length === 0) { continue }
        tokens.push({ type: TOKEN_NAME.TAG_NAME, value: token })
        token = ""
        continue
      }
      token += ch
    } else {
      /* VALUE TOKEN */
      if (isInString) {
        token += ch
        if (strTokenStart === ch) {
          tokens.push({ type: TOKEN_NAME.VALUE, value: token })
          token = ""
          isInString = false
        }
        continue
      }

      if (ch === "\'" || ch === "\"") {
        isInString = true
        strTokenStart = ch
        token += ch
        continue
      }

      if (ch === '>') {
        addKeyToken()
        tokens.push({ type: TOKEN_NAME.VALUE, value: ch })
        token = ""
        continue
      }

      /** KEY TOKEN */
      if (ch === "=") {
        addKeyToken()
        tokens.push({ type: TOKEN_NAME.EQUAL, value: ch })
        token = ""
        continue
      }

      if (ch.match(/\s/)) {
        addKeyToken()
        token = ""
        continue
      }

      token += ch
    }
  }

  return tokens
}

export const parseAttributeName = (attr) => tokenizer(attr).filter((t) => (t.type === TOKEN_NAME.KEY)).map((t) => t.value)

console.log(parseAttributeName(
  `<div danm-good name="jerry" productName="{{ name }} = {{ titel }} 'xhit' danm-good='what?'" value>`
))

