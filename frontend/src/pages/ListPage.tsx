import { Alert, Breadcrumbs, Button, Card, Chip, Disclosure, Link, Switch, Table } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';
import { useParams } from 'react-router-dom';
import { GameResult, ListEntryKind, useClients } from 'src/api';
import { ArmyLink, EventLink, ListProducts, ModelTypeBadge, PageHeader, PlayerLink, QueryState, WikiLink } from 'src/components';
import { LONGSHANKS_URL } from 'src/lib/factions';
import { usePreferences } from 'src/lib/preferences';

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
        <Breadcrumbs.Item href="/lists">Lists</Breadcrumbs.Item>
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
                  “{data.title}” by <PlayerLink id={data.playerId}>{data.playerName}</PlayerLink> at{' '}
                  <EventLink id={data.eventId}>{data.eventName}</EventLink> ({data.eventDate}) · placed {data.rank ?? '–'} of{' '}
                  {data.eventPlayers}
                  {data.eventWins !== null && `, ${data.eventWins}-${data.eventLosses} overall`}
                </>
              }
            />

            <div className="grid items-start gap-6 lg:grid-cols-2">
              <Card>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-semibold">List</h2>
                  <span className="text-muted text-sm">
                    {data.format}
                    {data.totalPoints !== null && ` · ${data.totalPoints}/${data.pointLevel ?? '?'} pts`}
                  </span>
                </div>

                {hasEquipment && (
                  <Switch isSelected={showEquipment} onChange={setShowEquipment}>
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                      Show equipment
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

                {data.commandCards.length > 0 && <p className="mt-3 text-sm">Command cards: {data.commandCards.join(', ')}</p>}

                <Disclosure>
                  <Disclosure.Heading>
                    <Button slot="trigger" size="sm" variant="secondary">
                      List as submitted
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
                    <h2 className="text-xl font-semibold">Games played with this list</h2>
                    <Link className="text-sm" href={`${LONGSHANKS_URL}/event/${data.eventId}/`} target="_blank" rel="noreferrer">
                      Longshanks
                      <Link.Icon />
                    </Link>
                  </div>

                  {data.playedGames.length === 0 ? (
                    <p className="mt-2 text-sm">No games could be linked to this list.</p>
                  ) : (
                    <Table>
                      <Table.ScrollContainer>
                        <Table.Content aria-label="Games played with this list">
                          <Table.Header>
                            <Table.Column>Round</Table.Column>
                            <Table.Column isRowHeader>Opponent</Table.Column>
                            <Table.Column>Scenario</Table.Column>
                            <Table.Column>Result</Table.Column>
                            <Table.Column>CP / AP</Table.Column>
                          </Table.Header>
                          <Table.Body>
                            {data.playedGames.map((game) => (
                              <Table.Row key={game.round} id={game.round}>
                                <Table.Cell>{game.round}</Table.Cell>
                                <Table.Cell>
                                  <PlayerLink id={game.opponentId}>{game.opponentName ?? 'Bye'}</PlayerLink>
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
                                    {game.result}
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
