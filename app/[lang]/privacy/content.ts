import { brand } from "@/lib/brand";
import type { Locale } from "@/lib/i18n/config";

/**
 * The privacy policy text, per language. Kept out of the UI dictionaries (which ship to the
 * browser) because only this page needs it. Update `updated` whenever the text changes, and keep
 * the three languages saying the same thing.
 */
export type PrivacyPolicy = {
  title: string;
  description: string;
  updated: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
};

/** ISO date of the last change, shown in each language's own format. */
export const PRIVACY_UPDATED = "2026-11-14";

const { name, owner, contactEmail } = brand;

export const privacyPolicies: Record<Locale, PrivacyPolicy> = {
  en: {
    title: "Privacy policy",
    description: `How ${name} handles your data: no accounts, no tracking cookies, and your favorites stay on your device.`,
    updated: "Last updated",
    intro: `${name} is a free Pokémon card catalog. It has no accounts and never asks for your name or email address. This page explains the little data involved in using it.`,
    sections: [
      {
        heading: "Who runs Podex",
        body: [
          `${name} (podexcards.com) is run by ${owner}, Denmark, who is the data controller. Questions about privacy go to ${contactEmail}.`,
        ],
      },
      {
        heading: "Saved on your device",
        body: [
          "Your favorite lists, the cards you mark as owned, recent searches and a few settings (such as your language and whether you dismissed the install notice) are saved in your browser's storage. They never leave your device unless you share them yourself.",
          `To protect your lists from browsers that clear site storage, ${name} also keeps a copy of them in cookies on your device. These cookies are only sent back to ${name} to restore your lists. The server doesn't store or read their content, and they last up to 400 days.`,
          "Backup and share links contain your lists inside the link itself. Anyone with the link can see those lists, so share it only with people you choose. We don't store the links.",
          "You can remove all of this at any time by clearing the site data for podexcards.com in your browser.",
        ],
      },
      {
        heading: "Card scanner",
        body: [
          "The scanner reads the card's number and name on your device. The camera image is never uploaded or stored. Only the text it reads is used to find the card.",
        ],
      },
      {
        heading: "Visitor statistics",
        body: [
          `${name} counts visits with Umami Cloud, a privacy-focused analytics service. It uses no cookies, doesn't store IP addresses and doesn't follow you across other websites. We see only totals, such as how many people opened a page, which country they visit from, and which kind of device and browser they use. The legal basis is our legitimate interest in knowing how the site is used so we can improve it.`,
        ],
      },
      {
        heading: "Hosting and card images",
        body: [
          `${name} is hosted by Vercel. Like any web server, it receives technical data such as your IP address and browser type when you load a page, and briefly keeps it in logs to deliver the site and protect it against abuse. Vercel processes this data on our behalf.`,
          "Card images come from TCGdex's image servers, so your browser connects to them directly when a card is shown.",
        ],
      },
      {
        heading: "Links to shops and social media",
        body: [
          `Some price links go to CardNexus through an affiliate programme (Impact). If you buy something after clicking one, ${name} may earn a small commission at no extra cost to you. CardNexus and Impact may use cookies to register the click. That happens on their sites and under their privacy policies, and we receive no personal data about you.`,
          `${name} posts on Instagram and Pinterest. When you visit those sites, their own privacy policies apply.`,
        ],
      },
      {
        heading: "Your rights",
        body: [
          `Under the GDPR you have the right to access, correct and delete personal data about you, and to object to its processing. Because ${name} keeps no personal data on its servers, there's usually nothing to look up. Write to ${contactEmail} if you have questions.`,
          "If you think we handle your data wrongly, you can complain to the Danish Data Protection Agency (Datatilsynet, datatilsynet.dk).",
        ],
      },
      {
        heading: "Changes",
        body: ["If this policy changes, the new version will be published on this page with a new date."],
      },
    ],
  },
  da: {
    title: "Privatlivspolitik",
    description: `Sådan håndterer ${name} dine data: ingen konti, ingen sporingscookies, og dine favoritter bliver på din enhed.`,
    updated: "Senest opdateret",
    intro: `${name} er et gratis katalog over Pokémon-kort. Der er ingen konti, og vi beder aldrig om dit navn eller din e-mailadresse. Her kan du læse om de få data, der indgår, når du bruger siden.`,
    sections: [
      {
        heading: "Hvem står bag Podex",
        body: [
          `${name} (podexcards.com) drives af ${owner}, Danmark, som er dataansvarlig. Spørgsmål om privatliv sendes til ${contactEmail}.`,
        ],
      },
      {
        heading: "Gemt på din enhed",
        body: [
          "Dine favoritlister, de kort du markerer som dine, seneste søgninger og nogle få indstillinger (fx dit sprog, og om du har lukket beskeden om at installere appen) gemmes i din browsers lager. De forlader aldrig din enhed, medmindre du selv deler dem.",
          `For at beskytte dine lister mod browsere, der rydder sidedata, gemmer ${name} også en kopi af dem i cookies på din enhed. Cookierne sendes kun tilbage til ${name} for at gendanne dine lister. Serveren gemmer eller læser ikke indholdet, og de holder i op til 400 dage.`,
          "Backup- og delingslinks indeholder dine lister i selve linket. Alle med linket kan se listerne, så del det kun med dem, du vælger. Vi gemmer ikke linkene.",
          "Du kan fjerne det hele når som helst ved at rydde sidedata for podexcards.com i din browser.",
        ],
      },
      {
        heading: "Kortscanner",
        body: [
          "Scanneren læser kortets nummer og navn på din enhed. Kamerabilledet bliver aldrig uploadet eller gemt. Kun den tekst, der læses, bruges til at finde kortet.",
        ],
      },
      {
        heading: "Besøgsstatistik",
        body: [
          `${name} tæller besøg med Umami Cloud, en privatlivsvenlig statistiktjeneste. Den bruger ingen cookies, gemmer ikke IP-adresser og følger dig ikke på tværs af andre websites. Vi ser kun samlede tal, fx hvor mange der har åbnet en side, hvilket land de besøger fra, og hvilken type enhed og browser de bruger. Retsgrundlaget er vores legitime interesse i at vide, hvordan siden bruges, så vi kan forbedre den.`,
        ],
      },
      {
        heading: "Hosting og kortbilleder",
        body: [
          `${name} hostes af Vercel. Som enhver webserver modtager den tekniske data som din IP-adresse og browsertype, når du åbner en side, og gemmer dem kortvarigt i logfiler for at levere siden og beskytte den mod misbrug. Vercel behandler disse data på vores vegne.`,
          "Kortbillederne kommer fra TCGdex' billedservere, så din browser forbinder direkte til dem, når et kort vises.",
        ],
      },
      {
        heading: "Links til butikker og sociale medier",
        body: [
          `Nogle prislinks går til CardNexus via et affiliateprogram (Impact). Hvis du køber noget efter at have klikket på et, kan ${name} få en lille provision, uden at det koster dig ekstra. CardNexus og Impact kan bruge cookies til at registrere klikket. Det sker på deres sider og efter deres privatlivspolitikker, og vi modtager ingen personoplysninger om dig.`,
          `${name} poster på Instagram og Pinterest. Når du besøger dem, gælder deres egne privatlivspolitikker.`,
        ],
      },
      {
        heading: "Dine rettigheder",
        body: [
          `Efter GDPR har du ret til indsigt i, berigtigelse og sletning af personoplysninger om dig, og til at gøre indsigelse mod behandlingen. Da ${name} ikke gemmer personoplysninger på sine servere, er der som regel intet at slå op. Skriv til ${contactEmail}, hvis du har spørgsmål.`,
          "Mener du, at vi behandler dine data forkert, kan du klage til Datatilsynet (datatilsynet.dk).",
        ],
      },
      {
        heading: "Ændringer",
        body: ["Hvis politikken ændres, offentliggøres den nye version på denne side med en ny dato."],
      },
    ],
  },
  es: {
    title: "Política de privacidad",
    description: `Cómo trata ${name} tus datos: sin cuentas, sin cookies de seguimiento y tus favoritos se quedan en tu dispositivo.`,
    updated: "Última actualización",
    intro: `${name} es un catálogo gratuito de cartas Pokémon. No tiene cuentas y nunca te pide tu nombre ni tu correo electrónico. Esta página explica los pocos datos que intervienen al usarlo.`,
    sections: [
      {
        heading: "Quién gestiona Podex",
        body: [
          `${name} (podexcards.com) lo gestiona ${owner}, Dinamarca, que es el responsable del tratamiento. Las preguntas sobre privacidad pueden enviarse a ${contactEmail}.`,
        ],
      },
      {
        heading: "Guardado en tu dispositivo",
        body: [
          "Tus listas de favoritos, las cartas que marcas como tuyas, tus búsquedas recientes y algunos ajustes (como tu idioma y si cerraste el aviso para instalar la app) se guardan en el almacenamiento de tu navegador. Nunca salen de tu dispositivo, salvo que tú mismo las compartas.",
          `Para proteger tus listas de los navegadores que borran los datos de los sitios, ${name} también guarda una copia en cookies en tu dispositivo. Estas cookies solo se envían de vuelta a ${name} para restaurar tus listas. El servidor no guarda ni lee su contenido, y duran hasta 400 días.`,
          "Los enlaces de copia de seguridad y para compartir contienen tus listas dentro del propio enlace. Cualquiera que tenga el enlace puede verlas, así que compártelo solo con quien tú elijas. No guardamos los enlaces.",
          "Puedes eliminar todo esto en cualquier momento borrando los datos del sitio podexcards.com en tu navegador.",
        ],
      },
      {
        heading: "Escáner de cartas",
        body: [
          "El escáner lee el número y el nombre de la carta en tu dispositivo. La imagen de la cámara nunca se sube ni se guarda. Solo se usa el texto leído para encontrar la carta.",
        ],
      },
      {
        heading: "Estadísticas de visitas",
        body: [
          `${name} cuenta las visitas con Umami Cloud, un servicio de estadísticas respetuoso con la privacidad. No usa cookies, no guarda direcciones IP y no te sigue por otros sitios web. Solo vemos totales, como cuántas personas abrieron una página, desde qué país la visitan y qué tipo de dispositivo y navegador usan. La base legal es nuestro interés legítimo en saber cómo se usa el sitio para poder mejorarlo.`,
        ],
      },
      {
        heading: "Alojamiento e imágenes de cartas",
        body: [
          `${name} está alojado en Vercel. Como cualquier servidor web, recibe datos técnicos como tu dirección IP y tu tipo de navegador cuando abres una página, y los guarda brevemente en registros para servir el sitio y protegerlo contra abusos. Vercel trata estos datos por encargo nuestro.`,
          "Las imágenes de las cartas vienen de los servidores de imágenes de TCGdex, así que tu navegador se conecta directamente a ellos cuando se muestra una carta.",
        ],
      },
      {
        heading: "Enlaces a tiendas y redes sociales",
        body: [
          `Algunos enlaces de precios llevan a CardNexus a través de un programa de afiliados (Impact). Si compras algo después de hacer clic en uno, ${name} puede recibir una pequeña comisión sin coste adicional para ti. CardNexus e Impact pueden usar cookies para registrar el clic. Eso ocurre en sus sitios y según sus políticas de privacidad, y no recibimos datos personales tuyos.`,
          `${name} publica en Instagram y Pinterest. Cuando visitas esos sitios, se aplican sus propias políticas de privacidad.`,
        ],
      },
      {
        heading: "Tus derechos",
        body: [
          `Según el RGPD tienes derecho a acceder a tus datos personales, rectificarlos y suprimirlos, y a oponerte a su tratamiento. Como ${name} no guarda datos personales en sus servidores, normalmente no hay nada que consultar. Escribe a ${contactEmail} si tienes preguntas.`,
          "Si crees que tratamos tus datos de forma incorrecta, puedes presentar una reclamación ante la autoridad danesa de protección de datos (Datatilsynet, datatilsynet.dk) o ante la autoridad de tu país.",
        ],
      },
      {
        heading: "Cambios",
        body: ["Si esta política cambia, la nueva versión se publicará en esta página con una nueva fecha."],
      },
    ],
  },
};
