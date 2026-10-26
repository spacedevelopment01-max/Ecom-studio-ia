// État d'un écran (?etat=…) : classe sur <body>, pour photographier plusieurs versions du même écran.
document.body.classList.add("etat-" + (new URLSearchParams(location.search).get("etat") || "base"));
