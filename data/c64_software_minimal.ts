export interface GameData {
  identifier: string
  description?: string
  mediatype?: string
  title: string
  date?: string
  creator?: string | string[]
  wikipedia?: string
  manual?: string | string[]
  tag?: string[]
  internetarchive?: string
}

// // Minimal dataset for testing - just first 50 games from the backup
// export const gamesData: GameData[] = [
//   {
//     "identifier": "msdos_Pac-Man_1983",
//     "description": "One of the most popular and influential games of the 1980's, Pac-Man stars a little, yellow dot-muncher who works his way around to clear a maze of the various dots and fruit which inhabit the board.",
//     "mediatype": "software",
//     "title": "Pac-Man",
//     "date": "1983-01-01T00:00:00Z",
//     "creator": "Namco Limited",
//     "tag": ["action"],
//     "internetarchive": "https://archive.org/details/msdos_Pac-Man_1983"
//   },
//   {
//     "identifier": "msdos_SimCity_1989", 
//     "description": "SimCity sets you as the mayor of a new municipality, with the responsibility of building and maintaining a place where citizens can move to and work and be happy.",
//     "mediatype": "software",
//     "title": "SimCity",
//     "date": "1989-01-01T00:00:00Z", 
//     "creator": "Maxis Software Inc.",
//     "tag": ["simulation"],
//     "internetarchive": "https://archive.org/details/msdos_SimCity_1989"
//   },
//   {
//     "identifier": "The_Hobbit_v1.0_1982_Melbourne_House",
//     "date": "1982-01-01T00:00:00Z",
//     "description": "The Hobbit is an illustrated text adventure computer game released in 1982 and based on the book The Hobbit, by J. R. R. Tolkien.",
//     "mediatype": "software", 
//     "title": "The Hobbit v1.0 (1982)(Melbourne House)",
//     "internetarchive": "https://archive.org/details/The_Hobbit_v1.0_1982_Melbourne_House"
//   },
//   {
//     "identifier": "Karateka_1984_Broderbund",
//     "date": "1984-01-01T00:00:00Z",
//     "description": "Karateka is a martial arts fighting game.",
//     "mediatype": "software",
//     "title": "Karateka (1984)(Broderbund)",
//     "creator": "Jordan Mechner",
//     "tag": ["action"],
//     "internetarchive": "https://archive.org/details/Karateka_1984_Broderbund"
//   },
//   {
//     "identifier": "Lode_Runner_1983_Broderbund",
//     "date": "1983-01-01T00:00:00Z", 
//     "description": "Lode Runner is a puzzle-platform game in which the player controls a character who must collect all the gold pieces in a level and then escape.",
//     "mediatype": "software",
//     "title": "Lode Runner (1983)(Broderbund)",
//     "creator": "Doug Smith",
//     "tag": ["action", "puzzle"],
//     "internetarchive": "https://archive.org/details/Lode_Runner_1983_Broderbund"
//   }
// ] as const satisfies readonly GameData[]

export const gamesData: GameData[] = []