import { Fragment, type ReactNode } from "react";
import { Divider, List, ListSubheader } from "@mui/material";

export default function GroupedSelectionList<T extends { id: string }>({
  items, groupSize, getLabel, children,
}: {
  items: T[];
  groupSize: number;
  getLabel: (item: T) => string;
  children: (item: T) => ReactNode;
}) {
  const isTutorial = (item: T) => /tutorial/i.test(`${item.id} ${getLabel(item)}`);
  const tutorials = items.filter(isTutorial);
  const regular = items.filter((item) => !isTutorial(item));

  return (
    <List dense>
      {tutorials.length > 0 && (
        <>
          <ListSubheader disableSticky>Tutorials</ListSubheader>
          {tutorials.map((item) => <Fragment key={item.id}>{children(item)}</Fragment>)}
          {regular.length > 0 && <Divider component="li" sx={{ my: 1 }} />}
        </>
      )}
      {regular.map((item, index) => (
        <Fragment key={item.id}>
          {index > 0 && index % groupSize === 0 && <Divider component="li" sx={{ my: 1 }} />}
          {children(item)}
        </Fragment>
      ))}
    </List>
  );
}
