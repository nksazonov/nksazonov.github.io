import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://nksazonov.github.io/",
    title: "Nikita Sazonov",
    description:
      "How to design and secure smart contracts that hold user funds: escrow, custody, state channels and cross-chain systems.",
    author: "Nikita Sazonov",
    profile: "https://github.com/nksazonov",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "Europe/Prague",
    dir: "ltr",
  },
  posts: {
    perPage: 4,
    perIndex: 4,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: true,
      url: "https://github.com/nksazonov/nksazonov.github.io/edit/main/",
    },
    search: "pagefind",
    toc: true,
  },
  socials: [
    { name: "github", url: "https://github.com/nksazonov" },
    { name: "linkedin", url: "https://www.linkedin.com/in/nksazonov/" },
    { name: "mail", url: "mailto:sazonov.nks@gmail.com" },
  ],
  shareLinks: [
    {
      name: "linkedin",
      url: "https://www.linkedin.com/sharing/share-offsite/?url=",
    },
    { name: "x", url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "mail", url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
