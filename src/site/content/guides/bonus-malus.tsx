import { GuideBody } from './types';
import { H2, Li, Prose, Table, Ul } from '../../blocks';

/**
 * Guida: bonus, malus e fantavoto.
 * La tabella usa i valori esatti di FantaClash (types/index.ts FANTASY_BONUSES).
 */
export const body: GuideBody = () => (
  <Prose>
    <p>
      Nel fantacalcio il voto misura come ha giocato il calciatore, ma è il fantavoto che decide le partite: gol,
      assist e cartellini entrano nel conto finale come bonus e malus. In FantaClash la regola è la stessa, con la
      tabella qui sotto.
    </p>

    <H2>Voto e fantavoto</H2>
    <p>
      Il <strong>voto</strong> è il giudizio sulla prestazione: quanto ha giocato, come, con che continuità. Va da 4 a
      9 e dipende dalla forma della squadra, dai gol segnati e subiti, dalle espulsioni e dagli infortuni.
    </p>
    <p>
      Il <strong>fantavoto</strong> aggiunge al voto i bonus e i malus degli eventi: un difensore che gioca bene ma
      commette un autogol ha un voto alto e un fantavoto basso. La somma dei fantavoti degli otto titolari decide
      l'esito del turno del torneo.
    </p>

    <H2>La tabella completa</H2>
    <Table
      head={['Evento', 'Fantavoto']}
      rows={[
        ['Gol segnato', '+3'],
        ['Assist', '+1'],
        ['Rigore parato', '+3'],
        ['Porta inviolata (portiere)', '+1'],
        ['Gol subito (portiere)', '−1 per gol'],
        ['Ammonizione', '−0,5'],
        ['Espulsione', '−1'],
        ['Rigore sbagliato', '−3'],
        ['Autogol', '−2'],
        ['Infortunio', '−0,5'],
      ]}
    />
    <p>
      Il bonus "porta inviolata" del portiere viene assegnato solo a partita finita: se a 89' è 0-0 e al 90' entra un
      gol, il portiere non lo ottiene. Lo stesso vale per l'espulsione: chi viene espulso non può superare il 5.
    </p>

    <H2>Come leggerla durante l'asta</H2>
    <p>
      La tabella dei bonus dice anche quali giocatori vale la pena comprare cari:
    </p>
    <Ul>
      <Li>
        <strong>I rigoristi.</strong> +3 per il rigore segnato e −3 per quello sbagliato fanno la differenza tra un
        fantavoto da 8 e uno da 4. In asta un attaccante che tira i rigori vale di più della sua media.
      </Li>
      <Li>
        <strong>I portieri di squadre forti.</strong> Il +1 per la porta inviolata premia chi gioca in difese solide.
        In FantaClash questo si traduce in un overall alto anche per portieri di squadre di vertice.
      </Li>
      <Li>
        <strong>I difensori che fanno gol.</strong> +3 per gol più il bonus di squadra rendono i difensori "offensivi"
        più preziosi di quanto sembri.
      </Li>
      <Li>
        <strong>Gli irruenti.</strong> Il malus da −0,5 dell'ammonizione sembra piccolo, ma due cartellini valgono un
        gol perso. In asta conviene scontare leggermente chi si ammonisce spesso.
      </Li>
    </Ul>

    <H2>Esempio pratico</H2>
    <p>
      Due attaccanti con lo stesso voto 7. Il primo segna due gol e un assist: fantavoto 7 + 3 + 3 + 1 = 14. Il
      secondo non segna ma viene ammonito: fantavoto 7 − 0,5 = 6,5. Il primo vale più del doppio del secondo, a parità
      di voto.
    </p>
    <p>
      Ecco perché i bonus e i malus si imparano a memoria: l'asta si vince comprando i giocatori che li portano, non
      quelli che prendono solo il voto.
    </p>
  </Prose>
);
