import Image from "next/image";
import Link from "next/link";
import { stateExploreHref } from "@/lib/state-routes";
import { stateCardImage } from "@/lib/state-images";

/** Two rows, split as evenly as 35 divides. */
const ROW_COUNT = 2;

/**
 * One pass of the whole row, in seconds.
 *
 * A row is about 4,400px of cards, so 140s works out near 31px a second —
 * roughly an eighth of a card's width per second, slow enough that a name is
 * readable while it travels rather than only once it has stopped. The two rows
 * differ so they never fall into step with each other.
 */
const ROW_SECONDS = [140, 160];

const STATE_CARDS: Array<{ name: string; details: string }> = [
  { name: "Delhi", details: "Delhi, Noida, Gurgaon" },
  { name: "Maharashtra", details: "Mumbai, Pune, Nagpur" },
  { name: "Karnataka", details: "Bangalore, Mysore, Mangalore" },
  { name: "Telangana", details: "Hyderabad, Warangal, Karimnagar" },
  { name: "Haryana", details: "Gurgaon, Faridabad, Panipat" },
  { name: "West Bengal", details: "Kolkata, Howrah, Durgapur" },
  { name: "Goa", details: "Panaji, Margao, Mapusa" },
  { name: "Gujarat", details: "Ahmedabad, Surat, Vadodara" },
  { name: "Tamil Nadu", details: "Chennai, Coimbatore, Madurai" },
  { name: "Uttar Pradesh", details: "Lucknow, Noida, Varanasi" },
  { name: "Rajasthan", details: "Jaipur, Udaipur, Jodhpur" },
  { name: "Kerala", details: "Kochi, Trivandrum, Kozhikode" },
  { name: "Punjab", details: "Chandigarh, Ludhiana, Amritsar" },
  { name: "Madhya Pradesh", details: "Indore, Bhopal, Gwalior" },
  { name: "Andhra Pradesh", details: "Visakhapatnam, Vijayawada, Guntur" },
  { name: "Arunachal Pradesh", details: "Itanagar, Tawang, Pasighat" },
  { name: "Assam", details: "Guwahati, Dibrugarh, Silchar" },
  { name: "Bihar", details: "Patna, Gaya, Muzaffarpur" },
  { name: "Chhattisgarh", details: "Raipur, Bhilai, Bilaspur" },
  { name: "Himachal Pradesh", details: "Shimla, Manali, Dharamshala" },
  { name: "Jharkhand", details: "Ranchi, Jamshedpur, Dhanbad" },
  { name: "Jammu & Kashmir", details: "Srinagar, Jammu, Gulmarg" },
  { name: "Manipur", details: "Imphal, Thoubal, Bishnupur" },
  { name: "Meghalaya", details: "Shillong, Cherrapunji, Tura" },
  { name: "Mizoram", details: "Aizawl, Lunglei, Champhai" },
  { name: "Nagaland", details: "Kohima, Dimapur, Mokokchung" },
  { name: "Odisha", details: "Bhubaneswar, Cuttack, Puri" },
  { name: "Sikkim", details: "Gangtok, Namchi, Pelling" },
  { name: "Tripura", details: "Agartala, Udaipur, Dharmanagar" },
  { name: "Uttarakhand", details: "Dehradun, Haridwar, Nainital" },
  // The islands sit with the South, which is the coast they are administered
  // and flown from; a zone of their own would be two tabs holding one card each.
  { name: "Andaman and Nicobar Islands", details: "Sri Vijaya Puram, Havelock, Neil Island" },
  { name: "Chandigarh", details: "Chandigarh, Manimajra, Sector 17" },
  { name: "Ladakh", details: "Leh, Kargil, Nubra" },
  { name: "Lakshadweep", details: "Kavaratti, Agatti, Minicoy" },
  { name: "Puducherry", details: "Puducherry, Karaikal, Mahe" },
];

/**
 * Every state and union territory, as two rows that drift past each other.
 *
 * This has been three things. It began as twelve states with the other
 * twenty-three hidden behind a "Can't find your state?" panel, which asked the
 * visitor to admit the list was too short before it would grow. Then it became
 * a grid under region tabs — North, South, and so on — which showed everything
 * but made the reader pick a zone before they could look, and left the other
 * five sixths of the country a click away.
 *
 * Now nothing is hidden and nothing is asked. All thirty-five go past on their
 * own, the two rows travelling opposite ways so the block reads as movement
 * rather than as one long queue. Hovering anywhere over it stops both rows, so
 * a card is never moving when someone reaches for it.
 */
export function StateExplorer() {
  const half = Math.ceil(STATE_CARDS.length / ROW_COUNT);
  const rows = [STATE_CARDS.slice(0, half), STATE_CARDS.slice(half)];

  return (
    /* Faded at both ends so the cards arrive and leave rather than being cut
       off against a hard edge. `group` is here because the pause below is set
       from a hover anywhere on the block, not row by row — catching one row
       while the other keeps moving reads as a glitch. */
    <div className="group space-y-3 [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
      {rows.map((row, index) => (
        <div
          key={index}
          /* Reduced motion turns the animation off; the row then has to be
             reachable some other way, so it becomes an ordinary scroller. */
          className="overflow-hidden motion-reduce:overflow-x-auto"
        >
          <div
            className={`mm-marquee flex w-max ${index % 2 === 1 ? "mm-marquee-reverse" : ""}`}
            /* Only the duration is set here — a longhand, so it leaves the
               hover pause and the reduced-motion rule in the stylesheet free to
               apply. The shorthand belongs in the CSS, where the keyframes it
               names can survive the build. */
            style={{ animationDuration: `${ROW_SECONDS[index]}s` }}
          >
            {/* The same set twice. The track is therefore two sets wide, and
                the keyframe's -50% lands the copy exactly where the original
                began — which is what makes the loop seamless rather than
                snapping back. The copy is hidden from assistive tech and from
                the tab order so the row is not announced or tabbed twice. */}
            {[0, 1].map((copy) => (
              <div
                key={copy}
                aria-hidden={copy === 1 || undefined}
                className="flex shrink-0 gap-3 pr-3"
              >
                {row.map((state) => (
                  <Link
                    key={state.name}
                    href={stateExploreHref(state.name)}
                    title={`${state.name} — ${state.details}`}
                    tabIndex={copy === 1 ? -1 : undefined}
                    className="flex w-[232px] shrink-0 items-center overflow-hidden rounded-xl border border-border bg-white transition-colors hover:border-saffron/60"
                  >
                    <span className="grid h-20 w-24 shrink-0 place-items-center border-r border-border">
                      <Image
                        src={stateCardImage(state.name)}
                        alt=""
                        width={160}
                        height={128}
                        className="h-14 w-20 object-contain"
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate px-3 text-sm font-medium text-foreground">
                      {state.name}
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
