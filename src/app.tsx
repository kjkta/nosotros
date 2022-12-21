import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { relayPool } from "nostr-tools";

interface Note {
  pubkey: string;
  content: string;
}

interface MetaData {
  [pubkey: string]: { name: string; about: string; picture: string };
}

export function App() {
  const items = useRef<{ [id: string]: Note }>({});
  const metaData = useRef<MetaData>({});
  const [relays, setRelays] = useState(["wss://relay.damus.io"]);
  const [loaded, setLoaded] = useState(false);

  const getNotes = useCallback(function () {
    setLoaded(false);
    const pool = relayPool();
    for (const relay of relays) {
      pool.addRelay(relay, { read: true, write: true });
    }

    function onEvent(evt, relay) {
      switch (evt.kind) {
        case 0:
          metaData.current = {
            ...metaData.current,
            [evt.pubkey]: JSON.parse(evt.content),
          };
          //handleMetadata(evt, relay);
          break;
        case 1:
          // handleTextNote(evt, relay);
          if (!items.current[evt.id]) {
            items.current[evt.id] = evt;
          }
          break;
        case 2:
          //handleRecommendServer(evt, relay);
          break;
        case 3:
          console.log("contact list", evt);
          // handleContactList(evt, relay);
          break;
        case 7:
        //handleReaction(evt, relay);
      }
    }

    const sub = pool.sub({
      cb: onEvent,
      filter: {
        kinds: [0, 1],
        since: Math.floor(Date.now() * 0.001 - 1000),
      },
    });

    setTimeout(function () {
      sub.unsub();
      setLoaded(true);
    }, 2000);
  }, []);

  useEffect(function () {
    getNotes();
  }, []);

  return (
    <div style={{ width: "100%", maxWidth: 400, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <p>Relays</p>
        {relays.map((relay) => (
          <div>
            {relay}{" "}
            <button
              onClick={function () {
                setRelays((relays) => relays.filter((r) => r !== relay));
              }}
            >
              x
            </button>
          </div>
        ))}
        <form
          onSubmit={function (e) {
            e.preventDefault();
            const inputEl = e.target.children[0];
            if (!relays.includes(inputEl.value)) {
              setRelays((rs) => rs.concat(inputEl.value));
            }

            inputEl.value = "";
          }}
        >
          <input type="text" />
          <button>Add</button>
        </form>
      </div>
      {loaded ? (
        <button
          onClick={function () {
            getNotes();
          }}
        >
          Reload
        </button>
      ) : (
        <div>Loading...</div>
      )}
      {Object.values(items.current).map(function (item) {
        const image = metaData.current[item.pubkey]?.picture;
        return (
          <div
            key={item.id}
            style={{ borderBottom: "1px solid lightgrey", padding: 15 }}
          >
            <img src={image} style={{ maxWidth: 50 }} />
            <p style={{ fontSize: 8 }}>{item.pubkey}</p>
            <p style={{ lineBreak: "anywhere" }}>{item.content}</p>
            <p style={{ textAlign: "right", fontSize: 10 }}>
              {new Date(item.created_at * 1000).toUTCString()}
            </p>
          </div>
        );
      })}
    </div>
  );
}
