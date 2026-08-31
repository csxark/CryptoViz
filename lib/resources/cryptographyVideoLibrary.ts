export type VideoDifficulty = "Beginner" | "Intermediate" | "Advanced"

export interface CryptoVideo {
  id: string
  title: string
  topic: string
  difficulty: VideoDifficulty
  duration: string
  provider: string
  tags: string[]
  description: string
  embedUrl: string
  watchUrl: string
  recommendedFor: string
}

export interface VideoLibraryFilter {
  search: string
  topic: string
  difficulty: "All" | VideoDifficulty
  tag: string
}

export interface VideoLibraryResult {
  filters: VideoLibraryFilter
  videos: CryptoVideo[]
  topics: string[]
  tags: string[]
  difficulties: string[]
  featuredVideo: CryptoVideo | null
  summary: {
    total: number
    beginner: number
    intermediate: number
    advanced: number
  }
}

export const DEFAULT_VIDEO_LIBRARY_FILTER: VideoLibraryFilter = {
  search: "",
  topic: "All",
  difficulty: "All",
  tag: "All",
}

export const CRYPTOGRAPHY_VIDEOS: CryptoVideo[] = [
  {
    id: "intro-modern-crypto",
    title: "Modern Cryptography Foundations",
    topic: "Foundations",
    difficulty: "Beginner",
    duration: "12 min",
    provider: "Curated lecture preview",
    tags: ["basics", "security goals", "keys"],
    description:
      "A beginner-friendly introduction to confidentiality, integrity, authentication, keys, and the difference between encoding, hashing, and encryption.",
    embedUrl: "https://www.youtube-nocookie.com/embed/jhXCTbFnK8o",
    watchUrl: "https://www.youtube.com/watch?v=jhXCTbFnK8o",
    recommendedFor: "New learners who need the big picture before exploring algorithms.",
  },
  {
    id: "aes-block-cipher",
    title: "AES and Block Cipher Intuition",
    topic: "Symmetric Encryption",
    difficulty: "Intermediate",
    duration: "18 min",
    provider: "Curated lecture preview",
    tags: ["AES", "block ciphers", "rounds"],
    description:
      "Explains how block ciphers transform fixed-size blocks through repeated rounds, substitution, permutation, and key mixing.",
    embedUrl: "https://www.youtube-nocookie.com/embed/O4xNJsjtN6E",
    watchUrl: "https://www.youtube.com/watch?v=O4xNJsjtN6E",
    recommendedFor: "Users exploring AES, DES, IDEA, and block-mode visualizers.",
  },
  {
    id: "rsa-public-key",
    title: "RSA Public-Key Cryptography",
    topic: "Asymmetric Encryption",
    difficulty: "Intermediate",
    duration: "16 min",
    provider: "Curated lecture preview",
    tags: ["RSA", "public key", "modular arithmetic"],
    description:
      "Introduces RSA key generation, encryption, decryption, and why public/private key pairs are useful.",
    embedUrl: "https://www.youtube-nocookie.com/embed/wXB-V_Keiu8",
    watchUrl: "https://www.youtube.com/watch?v=wXB-V_Keiu8",
    recommendedFor: "Users working through RSA key-generation or modular arithmetic demos.",
  },
  {
    id: "diffie-hellman",
    title: "Diffie-Hellman Key Exchange",
    topic: "Key Exchange",
    difficulty: "Beginner",
    duration: "10 min",
    provider: "Curated lecture preview",
    tags: ["Diffie-Hellman", "key exchange", "shared secret"],
    description:
      "Shows how two parties can agree on a shared secret over an insecure channel without sending the secret directly.",
    embedUrl: "https://www.youtube-nocookie.com/embed/YEBfamv-_do",
    watchUrl: "https://www.youtube.com/watch?v=YEBfamv-_do",
    recommendedFor: "Learners comparing symmetric keys with public-key exchange.",
  },
  {
    id: "hash-functions",
    title: "Hash Functions and Integrity",
    topic: "Hashing",
    difficulty: "Beginner",
    duration: "14 min",
    provider: "Curated lecture preview",
    tags: ["hashing", "integrity", "collisions"],
    description:
      "Covers one-way hashing, fixed-length digests, integrity checks, and why collisions matter.",
    embedUrl: "https://www.youtube-nocookie.com/embed/b4b8ktEV4Bg",
    watchUrl: "https://www.youtube.com/watch?v=b4b8ktEV4Bg",
    recommendedFor: "Users exploring SHA-256, CRC32, Merkle proofs, or collision demos.",
  },
  {
    id: "elliptic-curve",
    title: "Elliptic-Curve Cryptography Overview",
    topic: "Elliptic Curves",
    difficulty: "Advanced",
    duration: "22 min",
    provider: "Curated lecture preview",
    tags: ["ECC", "curves", "discrete log"],
    description:
      "Introduces elliptic-curve groups, scalar multiplication, and why ECC can provide strong security with smaller keys.",
    embedUrl: "https://www.youtube-nocookie.com/embed/NF1pwjL9-DE",
    watchUrl: "https://www.youtube.com/watch?v=NF1pwjL9-DE",
    recommendedFor: "Advanced learners studying ECDSA, Ed25519, X25519, or curve-based systems.",
  },
  {
    id: "side-channel",
    title: "Side-Channel Attacks Explained",
    topic: "Cryptanalysis",
    difficulty: "Advanced",
    duration: "20 min",
    provider: "Curated lecture preview",
    tags: ["side channels", "timing", "cache"],
    description:
      "Explains how implementation behavior such as timing, memory access, or power can leak secrets.",
    embedUrl: "https://www.youtube-nocookie.com/embed/7U-RbOKanYs",
    watchUrl: "https://www.youtube.com/watch?v=7U-RbOKanYs",
    recommendedFor: "Users exploring timing attacks, side-channel demos, and secure implementation practices.",
  },
  {
    id: "password-hashing",
    title: "Password Hashing and Key Derivation",
    topic: "Key Derivation",
    difficulty: "Intermediate",
    duration: "15 min",
    provider: "Curated lecture preview",
    tags: ["passwords", "salts", "KDF"],
    description:
      "Explains salts, work factors, password hashing, and why dedicated KDFs are different from fast general-purpose hashes.",
    embedUrl: "https://www.youtube-nocookie.com/embed/8ZtInClXe1Q",
    watchUrl: "https://www.youtube.com/watch?v=8ZtInClXe1Q",
    recommendedFor: "Users learning PBKDF2, bcrypt, scrypt, Argon2id, or dictionary attack concepts.",
  },
]

export function getVideoTopics(videos: CryptoVideo[] = CRYPTOGRAPHY_VIDEOS): string[] {
  return ["All", ...Array.from(new Set(videos.map((video) => video.topic))).sort()]
}

export function getVideoTags(videos: CryptoVideo[] = CRYPTOGRAPHY_VIDEOS): string[] {
  return ["All", ...Array.from(new Set(videos.flatMap((video) => video.tags))).sort()]
}

export function matchesSearch(video: CryptoVideo, search: string): boolean {
  const query = search.trim().toLowerCase()
  if (!query) return true

  return [
    video.title,
    video.topic,
    video.difficulty,
    video.description,
    video.provider,
    video.recommendedFor,
    ...video.tags,
  ]
    .join(" ")
    .toLowerCase()
    .includes(query)
}

export function filterCryptoVideos(
  filters: VideoLibraryFilter,
  videos: CryptoVideo[] = CRYPTOGRAPHY_VIDEOS,
): CryptoVideo[] {
  return videos.filter((video) => {
    const topicMatches = filters.topic === "All" || video.topic === filters.topic
    const difficultyMatches =
      filters.difficulty === "All" || video.difficulty === filters.difficulty
    const tagMatches = filters.tag === "All" || video.tags.includes(filters.tag)

    return topicMatches && difficultyMatches && tagMatches && matchesSearch(video, filters.search)
  })
}

export function buildVideoLibraryResult(
  filters: VideoLibraryFilter = DEFAULT_VIDEO_LIBRARY_FILTER,
): VideoLibraryResult {
  const videos = filterCryptoVideos(filters)
  const summaryVideos = CRYPTOGRAPHY_VIDEOS

  return {
    filters,
    videos,
    topics: getVideoTopics(),
    tags: getVideoTags(),
    difficulties: ["All", "Beginner", "Intermediate", "Advanced"],
    featuredVideo: videos[0] ?? null,
    summary: {
      total: summaryVideos.length,
      beginner: summaryVideos.filter((video) => video.difficulty === "Beginner").length,
      intermediate: summaryVideos.filter((video) => video.difficulty === "Intermediate").length,
      advanced: summaryVideos.filter((video) => video.difficulty === "Advanced").length,
    },
  }
}

export function buildVideoLibraryManualChecklist(): string[] {
  return [
    "Open the Curated Cryptography Video Library page.",
    "Confirm the featured embedded preview is visible.",
    "Search for AES and confirm matching videos are filtered.",
    "Filter by topic and confirm the video cards update.",
    "Filter by difficulty and confirm beginner/intermediate/advanced results update.",
    "Filter by tag and confirm only matching tagged videos remain.",
    "Open a watch link and confirm it uses a new browser tab.",
    "Resize to mobile width and confirm embedded previews and cards remain usable.",
  ]
}
