import { Alert, Breadcrumbs, Button, Card, Chip, Disclosure, Link, Switch, Table } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';
import { useParams } from 'react-router-dom';
import { GameResult, ListEntryKind, useClients } from 'src/api';
import { ArmyLink, EventLink, ListProducts, ModelTypeBadge, PageHeader, PlayerLink, QueryState, WikiLink } from 'src/components';
import { LONGSHANKS_URL } from 'src/lib/factions';
import { usePreferences } from 'src/lib/preferences';
import { texts } from 'src/texts';

const RESULT_COLORS: Record<GameResult, 'success' | 'danger' | 'default'> = {
  win: 'success',
  loss: 'danger',
  draw: 'default',
};

export function ListPage() {
  const { id } = useParams();
  const clients = useClients();
  const { showEquipment, setShowEquipment } = usePreferences();

  const { data, isLoading, error } = useQuery({
    queryKey: ['list', id],
    queryFn: () => clients.lists.getList(Number(id)),
  });

  const hasEquipment = data?.entries.some(({ kind }) => kind === ListEntryKind.Module) ?? false;
  const entries = (data?.entries ?? []).filter(({ kind }) => showEquipment || kind !== ListEntryKind.Module);

  return (
    <>
      <Breadcrumbs>
        <Breadcrumbs.Item href="/lists">{texts.common.lists}</Breadcrumbs.Item>
        <Breadcrumbs.Item>{data?.title ?? id}</Breadcrumbs.Item>
      </Breadcrumbs>

      <QueryState isLoading={isLoading} error={error}>
        {data && (
          <>
            <PageHeader
              kicker={<ArmyLink army={data.army} faction={data.faction} />}
              title={data.caster ?? data.title}
              image={data.casterImageUrl}
              description={
                <>
                  “{data.title}” {texts.lists.by} <PlayerLink id={data.playerId}>{data.playerName}</PlayerLink> {texts.lists.at}{' '}
                  <EventLink id={data.eventId}>{data.eventName}</EventLink> ({data.eventDate}) ·{' '}
                  {texts.lists.placed(data.rank ?? '–', data.eventPlayers)}
                  {data.eventWins !== null && `, ${texts.lists.overall(data.eventWins, data.eventLosses)}`}
                </>
              }
            />

            <div className="grid items-start gap-6 lg:grid-cols-2">
              <Card>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-semibold">{texts.common.list}</h2>
                  <span className="text-muted text-sm">
                    {data.format}
                    {data.totalPoints !== null && ` · ${texts.lists.listPoints(data.totalPoints, data.pointLevel ?? '?')}`}
                  </span>
                </div>

                {hasEquipment && (
                  <Switch isSelected={showEquipment} onChange={setShowEquipment}>
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                      {texts.lists.showEquipment}
                    </Switch.Content>
                  </Switch>
                )}

                {data.warnings.length > 0 && (
                  <Alert status="warning">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{data.warnings.join(' ')}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}

                <ul className="divide-separator divide-y">
                  {entries.map(({ name, points, depth, kind, modelName, modelType, wikiPage }, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between gap-4 py-1.5 pr-1"
                      style={{ paddingLeft: `${depth * 1.5}rem` }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={classNames({
                            'text-accent font-bold': kind === ListEntryKind.Leader,
                            'text-muted italic': kind === ListEntryKind.Module,
                          })}
                          title={modelName && modelName !== name ? modelName : undefined}
                        >
                          {name}
                        </span>
                        {modelType && <ModelTypeBadge type={modelType} />}
                        <WikiLink page={wikiPage} />
                      </div>
                      <span className="tabular-nums">{points ?? ''}</span>
                    </li>
                  ))}
                </ul>

                {data.commandCards.length > 0 && (
                  <p className="mt-3 text-sm">{texts.lists.commandCards(data.commandCards.join(', '))}</p>
                )}

                <Disclosure>
                  <Disclosure.Heading>
                    <Button slot="trigger" size="sm" variant="secondary">
                      {texts.lists.listAsSubmitted}
                      <Disclosure.Indicator />
                    </Button>
                  </Disclosure.Heading>
                  <Disclosure.Content>
                    <Disclosure.Body>
                      <pre className="bg-background mt-2 overflow-x-auto rounded p-3 text-xs">{data.rawText}</pre>
                    </Disclosure.Body>
                  </Disclosure.Content>
                </Disclosure>
              </Card>

              <div className="flex flex-col gap-6">
                <ListProducts list={data} />

                <Card>
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-xl font-semibold">{texts.lists.gamesPlayed}</h2>
                    <Link className="text-sm" href={`${LONGSHANKS_URL}/event/${data.eventId}/`} target="_blank" rel="noreferrer">
                      Longshanks
                      <Link.Icon />
                    </Link>
                  </div>

                  {data.playedGames.length === 0 ? (
                    <p className="mt-2 text-sm">{texts.lists.noLinkedGames}</p>
                  ) : (
                    <Table>
                      <Table.ScrollContainer>
                        <Table.Content aria-label={texts.lists.gamesPlayed}>
                          <Table.Header>
                            <Table.Column>{texts.lists.round}</Table.Column>
                            <Table.Column isRowHeader>{texts.common.opponent}</Table.Column>
                            <Table.Column>{texts.lists.scenario}</Table.Column>
                            <Table.Column>{texts.lists.result}</Table.Column>
                            <Table.Column>{texts.lists.controlAndArmyPoints}</Table.Column>
                          </Table.Header>
                          <Table.Body>
                            {data.playedGames.map((game) => (
                              <Table.Row key={game.round} id={game.round}>
                                <Table.Cell>{game.round}</Table.Cell>
                                <Table.Cell>
                                  <PlayerLink id={game.opponentId}>{game.opponentName ?? texts.lists.bye}</PlayerLink>
                                  {game.opponentArmy && (
                                    <div className="text-muted text-xs">
                                      {game.opponentArmy}
                                      {game.opponentCaster && ` – ${game.opponentCaster}`}
                                    </div>
                                  )}
                                </Table.Cell>
                                <Table.Cell>{game.scenario ?? '–'}</Table.Cell>
                                <Table.Cell>
                                  <Chip size="sm" color={RESULT_COLORS[game.result]}>
                                    {texts.lists.results[game.result]}
                                  </Chip>
                                </Table.Cell>
                                <Table.Cell className="whitespace-nowrap tabular-nums">
                                  {game.controlPoints ?? '–'} / {game.armyPoints ?? '–'}
                                </Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table.Content>
                      </Table.ScrollContainer>
                    </Table>
                  )}
                </Card>
              </div>
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
