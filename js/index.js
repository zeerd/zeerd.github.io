let path = null

setInterval(() => {
  if (path !== window.location.pathname) {
    path = window.location.pathname
    document.querySelectorAll('.language-mermaid').forEach(node => {
      node.className = "mermaid";
    })
    window.mermaid.initialize({ theme: 'default' })
    window.mermaid.init(undefined, document.querySelectorAll('.language-mermaid'))
  }
}, 1000)

