import { View, StyleSheet } from 'react-native';
import { IconButton } from './IconButton';

interface CardActionsProps {
  /** Called when edit button is pressed */
  onEdit?: () => void;
  /** Called when delete button is pressed */
  onDelete?: () => void;
  /** Called when more actions button is pressed */
  onMore?: () => void;
  /** Whether delete is disabled (e.g., item has dependencies) */
  deleteDisabled?: boolean;
  /** Whether edit is disabled */
  editDisabled?: boolean;
}

/**
 * CardActions - consistent action buttons for list item cards.
 * Renders edit/delete/more buttons with consistent styling and spacing.
 *
 * @example
 * <Card>
 *   <CardContent ... />
 *   <CardActions
 *     onEdit={() => handleEdit(item)}
 *     onDelete={() => handleDelete(item)}
 *     deleteDisabled={item.device_count > 0}
 *   />
 * </Card>
 */
export function CardActions({
  onEdit,
  onDelete,
  onMore,
  deleteDisabled = false,
  editDisabled = false,
}: CardActionsProps) {
  // Don't render if no actions provided
  if (!onEdit && !onDelete && !onMore) {
    return null;
  }

  return (
    <View style={styles.actions}>
      {onEdit && (
        <IconButton icon="edit" onPress={onEdit} disabled={editDisabled} />
      )}
      {onDelete && (
        <IconButton icon="delete" onPress={onDelete} disabled={deleteDisabled} />
      )}
      {onMore && (
        <IconButton icon="more-vert" onPress={onMore} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
});
