import { For, Show, JSX, Component, ParentComponent } from 'solid-js';
import { useI18n } from '@lib/i18n';
import '@styles/table.scss';

type DataLabel = string;

/** Handlers a cell or row may take (spread onto the element). */
type Handlers<T extends HTMLElement> = Pick<
    JSX.HTMLAttributes<T>,
    | 'onClick'
    | 'onDblClick'
    | 'onContextMenu'
    | 'onKeyDown'
    | 'onPointerEnter'
    | 'onPointerLeave'
>;

type CellProps = {
    label: DataLabel;
    text?: string;
    /** Translation key for text; text is the fallback. */
    i18n?: string;
    events?: Handlers<HTMLTableCellElement>;
    props?: JSX.HTMLAttributes<HTMLTableCellElement>;
};

type RowProps = {
    events?: Handlers<HTMLTableRowElement>;
};

export const Cell: ParentComponent<CellProps> = (props) => {
    const { t } = useI18n();
    return (
        <td
            data-label={props.label}
            title={props.text}
            {...props.props}
            {...props.events}
        >
            {props.children ?? (
                <span>
                    {props.i18n ? t(props.i18n, props.text) : props.text}
                </span>
            )}
        </td>
    );
};

export const Row: ParentComponent<RowProps> = (props) => {
    return (
        <tr class="row" {...props.events}>
            {props.children}
        </tr>
    );
};

type RowFactoryProps<T> = {
    item: T;
};

type TableProps<T> = {
    data: T[];
    headers: DataLabel[];
    placeholder: Component;
    /** Renders one row (usually a <Row>) for an item. */
    render: (props: RowFactoryProps<T>) => JSX.Element;
    tableProps?: JSX.HTMLAttributes<HTMLTableElement>;
};

export function Table<T>(props: TableProps<T>) {
    return (
        <Show
            when={props.data.length > 0}
            fallback={
                <div class="placeholder">
                    <props.placeholder />
                </div>
            }
        >
            <table {...props.tableProps}>
                <thead>
                    <tr class="headers">
                        <For each={props.headers}>
                            {(header) => <th>{header}</th>}
                        </For>
                    </tr>
                </thead>
                <tbody>
                    <For each={props.data}>
                        {(item) => props.render({ item })}
                    </For>
                </tbody>
            </table>
        </Show>
    );
}
