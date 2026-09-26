# Variabili dinamiche del README

<!--
Come funziona
- Modifichi questo file, fai commit: la GitHub Action rigenera gli SVG in assets/.
- Ogni riga "- chiave: valore" è una variabile. Più valori separati da " | "
  diventano una lista (righe di testo, pillole, icone).

Testo della presentazione (about → intro / intro_mobile)
- Ogni valore separato da " | " è una riga, così decidi tu dove andare a capo.
- Se scrivi tutto in un unico valore (senza " | "), va a capo da solo.
- Se togli intro_mobile, la versione mobile riusa intro andando a capo da sola.
- ***testo*** = evidenza forte · **testo** = evidenza · "~ " a inizio riga = riga attenuata

Card (currently, interested, goal)
- Stesse regole: con " | " decidi le righe, altrimenti a capo automatico. Massimo 2 righe.
- learning: ogni valore diventa una pillola.
- Per cambiare il titolo di una card: currently_label, learning_label, interested_label, goal_label.

Tech stack
- Una sezione "## stack-<nome>" per ogni box → assets/stack-<nome>-ghost.svg
- icons: gli id di https://skillicons.dev (py, ts, rust, docker...). Le icone nuove
  vengono scaricate e salvate in icons/ al primo utilizzo.
- Aggiungendo una sezione nuova ricordati di inserire l'immagine nel README.
-->

## theme
- border: #F8F8FF
- accent: #7BCFA4
- text: #E6EDF3
- body: #C9D3DC
- muted: #8B98A5
- card: #0d1117
- glow: 0.30

## about
- intro: I'm a ***curious builder*** who enjoys turning ideas into working systems, | from concept to clean, maintainable code. I love exploring how | **technology**, **design** and **human behavior** intersect, | ~ and I'm always learning something new.
- intro_mobile: I'm a ***curious builder*** who enjoys turning | ideas into working systems, from concept | to clean, maintainable code. I love | exploring how **technology**, **design** | and **human behavior** intersect. | ~ Always learning something new.
- currently: Improving my full-stack | development workflow
- learning: Python | C# | Rust
- interested: How systems evolve and interact, | in code and in organizations
- goal: Write code that's both | functional and meaningful

## stack-backend
- label: Backend
- icons: cs | py | rust | java | nodejs | postgres | mongodb

## stack-frontend
- label: Frontend
- icons: js | ts | react | angular | css | tailwind | vite

## stack-tools
- label: Tools & Others
- icons: git | docker | kubernetes | figma
